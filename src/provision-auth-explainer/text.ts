import {
  accountOrRepoRefToString,
  repoRefToString,
} from "../github-reference.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthResultExplainer,
  ProvisionAuthRuleResult,
} from "../type/provision-auth-result.js";
import type { ProvisionSecretsRule } from "../type/provision-rule.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextProvisionAuthExplainer(): ProvisionAuthResultExplainer<string> {
  return (result) => {
    const { isAllowed, rules } = result;

    return (
      `${explainSummary(result)}\n  ` +
      `${renderIcon(isAllowed)} ` +
      `${isAllowed ? "Can" : "Can't"} ` +
      `provision to ${explainSubject(result)} ${explainBasedOnRules(rules)}`
    );
  };

  function explainSummary({ request, isAllowed }: ProvisionAuthResult): string {
    return (
      `${renderIcon(isAllowed)} Repo ${repoRefToString(request.requester)} ` +
      (isAllowed ? "was allowed" : "wasn't allowed") +
      ` to provision secret ${request.name}:`
    );
  }

  function explainSubject({ request }: ProvisionAuthResult): string {
    const type = ((r) => {
      const type = r.type;

      switch (type) {
        case "actions":
          return "Actions";
        case "codespaces":
          return "Codespaces";
        case "dependabot":
          return "Dependabot";
        case "environment":
          return `environment ${r.target.environment}`;
        /* v8 ignore start */
      }

      throw new Error(
        `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
      );
      /* v8 ignore stop */
    })(request);

    return `${type} in ${accountOrRepoRefToString(request.target)}`;
  }

  function explainBasedOnRules(rules: ProvisionAuthRuleResult[]): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";
    const basedOn =
      ruleCount < 1
        ? "(no matching rules)"
        : `based on ${ruleCount} ${ruleOrRules}`;

    if (ruleCount < 1) return basedOn;

    let explainedRules = "";

    for (const ruleResult of rules) {
      explainedRules += "\n" + explainRule(ruleResult);
    }

    return `${basedOn}:${explainedRules}`;
  }

  function explainRule({ index, rule, have }: ProvisionAuthRuleResult): string {
    const isAllowed = have === "allow";

    return (
      `    ${renderIcon(isAllowed)} ` +
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
