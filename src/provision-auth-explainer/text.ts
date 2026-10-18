import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, PASS_ICON, icon } from "../icon.js";
import { pluralize } from "../pluralize.js";
import { isRepoProvisionAuthTargetResult } from "../provision-auth-result.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "../provision-request.js";
import { secretTypeText } from "../secret-type.js";
import { createSequencer } from "../sequencer.js";
import type {
  ProvisionAuthAccountTargetResult,
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthSelectedRepoResult,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";
import { accountSecretVisibilityCategoryLabel } from "./account-secret-visibility-category.js";

export function createTextProvisionAuthExplainer(): ProvisionAuthResultExplainer<string> {
  const tokenSeq = createSequencer<TokenAuthResult>();

  return (result) => {
    return (
      explainSummary(result) + explainTokenDec(result) + explainTargets(result)
    );
  };

  function explainSummary({ request, isAllowed }: ProvisionAuthResult): string {
    return (
      `${icon(isAllowed)} Repo ${repoRefToString(request.requester)} ` +
      (isAllowed ? "was allowed" : "wasn't allowed") +
      ` to provision secret ${request.name}:`
    );
  }

  function explainTokenDec(result: ProvisionAuthResult): string {
    const { request } = result;
    const { secretDec, tokenDec, tokenDecIsRegistered } = request;

    if (tokenDec) {
      return `\n  ${PASS_ICON} Can use token declaration ${secretDec.token}`;
    }

    return (
      `\n  ${FAIL_ICON} ` +
      `Can't use token declaration ${secretDec.token} because ` +
      (tokenDecIsRegistered ? "it isn't shared" : "it doesn't exist")
    );
  }

  function explainTargets({
    results,
    isMissingTargets,
  }: ProvisionAuthResult): string {
    if (isMissingTargets) return `\n  ${FAIL_ICON} No targets specified`;

    const sortedResults = [...results];
    sortedResults.sort((a, b) =>
      compareProvisionRequestTarget(a.target, b.target),
    );

    let explained = "";
    for (const result of sortedResults) explained += explainTarget(result);

    return explained;
  }

  function explainTarget(result: ProvisionAuthTargetResult): string {
    const { isAllowed, target } = result;

    return (
      `\n  ${icon(isAllowed)} ${isAllowed ? "Can" : "Can't"} ` +
      `provision token to ${explainSubject(target)}:` +
      explainTargetToken(result) +
      explainBasedOnRules(target, result) +
      (isRepoProvisionAuthTargetResult(result)
        ? ""
        : explainSelectedRepositories(target, result))
    );
  }

  function explainTargetToken({
    isTokenAllowed,
    tokenAuthResult,
  }: ProvisionAuthTargetResult): string {
    if (!tokenAuthResult) {
      return (
        `\n    ${FAIL_ICON} ` +
        `Token can't be authorized without a declaration`
      );
    }

    const name = accountOrRepoRefToString(tokenAuthResult.request.consumer);
    const ref = `#${tokenSeq(tokenAuthResult)}`;
    const kind = isRepoRef(tokenAuthResult.request.consumer)
      ? "Repo"
      : "Account";

    return (
      `\n    ${icon(isTokenAllowed)} ${kind} ${name} ` +
      `was ${isTokenAllowed ? "allowed" : "denied"} access to token ${ref}`
    );
  }

  function explainSubject(target: ProvisionRequestTarget): string {
    return (
      `${secretTypeText(target)} secret in ` +
      (isRepoProvisionRequestTarget(target)
        ? `${target.visibility} repo `
        : "account ") +
      `${accountOrRepoRefToString(target.target)}`
    );
  }

  function explainBasedOnRules(
    target: ProvisionRequestTarget,
    {
      isProvisionAllowed,
      isSecretVisibilityCategoryAllowed,
      rules,
    }: ProvisionAuthTargetResult,
  ): string {
    const isAllowed = isRepoProvisionRequestTarget(target)
      ? isProvisionAllowed
      : isSecretVisibilityCategoryAllowed;
    const ruleCount = rules.length;
    const summary =
      `\n    ${icon(isAllowed)} ` +
      `${isAllowed ? "Can" : "Can't"} ` +
      `provision ${explainProvisionTo(target)}` +
      (ruleCount < 1
        ? "(no matching rules)"
        : `based on ${pluralize(ruleCount, "rule", "rules")}:`);

    if (ruleCount < 1) return summary;

    let explainedRules = "";
    for (const ruleResult of rules) {
      explainedRules += explainRule(ruleResult);
    }

    return `${summary}${explainedRules}`;
  }

  function explainProvisionTo(target: ProvisionRequestTarget): string {
    return isRepoProvisionRequestTarget(target)
      ? "secret "
      : `to ${accountSecretVisibilityCategoryLabel(target.visibility)} `;
  }

  function explainSelectedRepositories(
    target: ProvisionRequestTarget,
    result: ProvisionAuthAccountTargetResult,
  ): string {
    const { selectedRepos } = result;

    if (!selectedRepos) return "";

    const { visibility } = target;
    const repos = Object.entries(selectedRepos.results);
    repos.sort(([a], [b]) => a.localeCompare(b));

    let explained = "";
    for (const [repo, repoResult] of repos) {
      explained += explainSelectedRepository(repo, repoResult);
    }

    if (!selectedRepos.isMatched && typeof visibility !== "string") {
      explained +=
        `\n    ${FAIL_ICON} ` +
        `No repositories matched the patterns ${visibility.patterns.join(", ")}`;
    }

    return explained;
  }

  function explainSelectedRepository(
    repo: string,
    { isAllowed, rules, visibility }: ProvisionAuthSelectedRepoResult,
  ): string {
    let explained =
      `\n    ${icon(isAllowed)} ` +
      `${isAllowed ? "Can" : "Can't"} ` +
      `provision secret to ${visibility} repo ${repo}:`;

    if (rules.length < 1) {
      return (
        explained +
        `\n      ${FAIL_ICON} Can't provision secret (no matching rules)`
      );
    }

    for (const ruleResult of rules) {
      explained += explainRule(ruleResult);
    }

    return explained;
  }

  function explainRule({
    index,
    rule,
    have,
  }: ProvisionAuthTargetRuleResult): string {
    const isAllowed = have === "allow";

    return (
      `\n      ${icon(isAllowed)} ` +
      `${isAllowed ? "Allowed" : "Denied"} by rule ${renderRule(index, rule)}`
    );
  }

  function renderRule(
    index: number,
    { description }: ProvisionSecretsRule,
  ): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }
}
