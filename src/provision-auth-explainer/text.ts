import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  isRepoRef,
  repoRefToString,
} from "../github-reference.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextProvisionAuthExplainer(
  tokenResults: TokenAuthResult[],
): ProvisionAuthResultExplainer<string> {
  return (result) => {
    return (
      explainSummary(result) + explainTokenDec(result) + explainTargets(result)
    );
  };

  function explainSummary({ request, isAllowed }: ProvisionAuthResult): string {
    return (
      `${renderIcon(isAllowed)} Repo ${repoRefToString(request.requester)} ` +
      (isAllowed ? "was allowed" : "wasn't allowed") +
      ` to provision secret ${request.name}:`
    );
  }

  function explainTokenDec(result: ProvisionAuthResult): string {
    const { request } = result;
    const { secretDec, tokenDec, tokenDecIsRegistered } = request;

    if (tokenDec) return `\n  ✅ Can use token declaration ${secretDec.token}`;

    return (
      `\n  ❌ Can't use token declaration ${secretDec.token} because ` +
      (tokenDecIsRegistered ? "it isn't shared" : "it doesn't exist")
    );
  }

  function explainTargets({
    request,
    results,
    isMissingTargets,
  }: ProvisionAuthResult): string {
    if (isMissingTargets) {
      return `\n  ${renderIcon(false)} No targets specified`;
    }

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
      `\n  ${renderIcon(isAllowed)} ` +
      `${isAllowed ? "Can" : "Can't"} ` +
      `provision token to ${explainSubject(target)}:` +
      explainTargetToken(result) +
      explainTargetProvisioning(result)
    );
  }

  function explainTargetToken({
    isTokenAllowed,
    tokenAuthResult,
  }: ProvisionAuthTargetResult): string {
    if (!tokenAuthResult) {
      return `\n    ❌ Token can't be authorized without a declaration`;
    }

    const name = accountOrRepoRefToString(tokenAuthResult.request.consumer);
    const ref = `#${tokenResults.indexOf(tokenAuthResult) + 1}`;

    if (isRepoRef(tokenAuthResult.request.consumer)) {
      return (
        `\n    ${renderIcon(isTokenAllowed)} Repo ${name} ` +
        `was ${isTokenAllowed ? "allowed" : "denied"} access to token ${ref}`
      );
    }

    return (
      `\n    ${renderIcon(isTokenAllowed)} Account ${name} ` +
      `was ${isTokenAllowed ? "allowed" : "denied"} access to token ${ref}`
    );
  }

  function explainTargetProvisioning({
    isProvisionAllowed,
    rules,
  }: ProvisionAuthTargetResult): string {
    return (
      `\n    ${renderIcon(isProvisionAllowed)} ` +
      `${isProvisionAllowed ? "Can" : "Can't"} ` +
      `provision secret ${explainBasedOnRules(rules)}`
    );
  }

  function explainSubject(target: ProvisionRequestTarget): string {
    const type = ((r) => {
      const type = r.type;

      switch (type) {
        case "actions":
          return "GitHub Actions";
        case "codespaces":
          return "GitHub Codespaces";
        case "dependabot":
          return "Dependabot";
        case "environment":
          return `GitHub environment ${r.target.environment}`;
        /* v8 ignore start */
      }

      throw new Error(
        `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
      );
      /* v8 ignore stop */
    })(target);

    return `${type} secret in ${accountOrRepoRefToString(target.target)}`;
  }

  function explainBasedOnRules(rules: ProvisionAuthTargetRuleResult[]): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";
    const basedOn =
      ruleCount < 1
        ? "(no matching rules)"
        : `based on ${ruleCount} ${ruleOrRules}`;

    if (ruleCount < 1) return basedOn;

    let explainedRules = "";
    for (const ruleResult of rules) explainedRules += explainRule(ruleResult);

    return `${basedOn}:${explainedRules}`;
  }

  function explainRule({
    index,
    rule,
    have,
  }: ProvisionAuthTargetRuleResult): string {
    const isAllowed = have === "allow";

    return (
      `\n      ${renderIcon(isAllowed)} ` +
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

  function renderIcon(isAllowed: boolean): string {
    return isAllowed ? ALLOWED_ICON : DENIED_ICON;
  }
}
