import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import { FAIL_ICON, PASS_ICON, icon } from "../icon.js";
import { pluralize } from "../pluralize.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import { secretTypeText } from "../secret-type.js";
import { createSequencer } from "../sequencer.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";

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
    request,
    results,
    isMissingTargets,
  }: ProvisionAuthResult): string {
    if (isMissingTargets) return `\n  ${FAIL_ICON} No targets specified`;

    const entries: [
      target: ProvisionRequestTarget,
      result: ProvisionAuthTargetResult,
    ][] = [];
    for (let i = 0; i < results.length; ++i) {
      entries.push([request.to[i], results[i]]);
    }
    entries.sort(([a], [b]) => compareProvisionRequestTarget(a, b));

    let explained = "";
    for (const [target, result] of entries) {
      explained += explainTarget(target, result);
    }

    return explained;
  }

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisionAuthTargetResult,
  ): string {
    const { isAllowed } = result;

    return (
      `\n  ${icon(isAllowed)} ` +
      `${isAllowed ? "Can" : "Can't"} ` +
      `provision token to ${explainSubject(target)}:` +
      explainTargetToken(result) +
      explainBasedOnRules(result.isProvisionAllowed, result.rules)
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
      `${accountOrRepoRefToString(target.target)}`
    );
  }

  function explainBasedOnRules(
    isProvisionAllowed: boolean,
    rules: ProvisionAuthTargetRuleResult[],
  ): string {
    const ruleCount = rules.length;
    const summary =
      `\n    ${icon(isProvisionAllowed)} ` +
      `${isProvisionAllowed ? "Can" : "Can't"} ` +
      `provision secret ` +
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
