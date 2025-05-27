import { compareProvisionRequestTarget } from "../compare-provision-request-target.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthTargetResult,
  ProvisionAuthTargetRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionRequestTarget } from "../type/provision-request.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextProvisionAuthExplainer(): ProvisionAuthResultExplainer<string> {
  return (result) => {
    const { request, results, isMissingTargets } = result;

    if (isMissingTargets) {
      return (
        explainSummary(result) + `\n  ${renderIcon(false)} No targets specified`
      );
    }

    const entries: [
      target: ProvisionRequestTarget,
      result: ProvisionAuthTargetResult,
    ][] = [];
    for (let i = 0; i < results.length; ++i) {
      entries.push([request.to[i], results[i]]);
    }
    entries.sort(([a], [b]) => compareProvisionRequestTarget(a, b));

    let explainedTargets = "";
    for (const [target, result] of entries) {
      explainedTargets += explainTarget(target, result);
    }

    return explainSummary(result) + explainedTargets;
  };

  function explainTarget(
    target: ProvisionRequestTarget,
    { isAllowed, rules }: ProvisionAuthTargetResult,
  ): string {
    return (
      `\n  ${renderIcon(isAllowed)} ` +
      `${isAllowed ? "Can" : "Can't"} ` +
      `provision token to ${explainSubject(target)} ${explainBasedOnRules(rules)}`
    );
  }

  function explainSummary({ request, isAllowed }: ProvisionAuthResult): string {
    return (
      `${renderIcon(isAllowed)} Repo ${repoRefToString(request.requester)} ` +
      (isAllowed ? "was allowed" : "wasn't allowed") +
      ` to provision secret ${request.name}:`
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
      `\n    ${renderIcon(isAllowed)} ` +
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
