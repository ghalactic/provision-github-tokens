import { isSufficientAccess } from "../access-level.js";
import type { InstallationPermissions } from "../type/github-api.js";
import type { RepositoryPermissionRule } from "../type/permission-rule.js";
import type {
  RepositoryTokenAuthorizationResourceResult,
  RepositoryTokenAuthorizationResourceResultRuleResult,
  RepositoryTokenAuthorizationResult,
  RepositoryTokenAuthorizationResultExplainer,
} from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextRepoAuthExplainer(): RepositoryTokenAuthorizationResultExplainer<string> {
  return (result) => {
    const { resourceOwner, resources, want } = result;
    const resourceEntries = Object.entries(resources).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    let explainedResources = "";
    for (const [resource, resourceResult] of resourceEntries) {
      explainedResources +=
        "\n" + explainResource(resourceOwner, resource, want, resourceResult);
    }

    return explainSummary(result) + explainedResources;
  };

  function explainSummary({
    consumer,
    isAllowed,
  }: RepositoryTokenAuthorizationResult): string {
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `${icon} Repo ${consumer} ` +
      `was ${isAllowed ? "allowed" : "denied"} access to a token:`
    );
  }

  function explainResource(
    resourceOwner: string,
    resource: string,
    want: InstallationPermissions,
    resourceResult: RepositoryTokenAuthorizationResourceResult,
  ): string {
    const summary = explainResourceSummary(
      resourceOwner,
      resource,
      resourceResult,
    );
    const ruleCount = resourceResult.rules.length;

    if (ruleCount < 1) return summary;

    let explainedRules = "";
    for (const ruleResult of resourceResult.rules) {
      explainedRules += "\n" + explainRule(want, ruleResult);
    }

    return `${summary}:${explainedRules}`;
  }

  function explainResourceSummary(
    resourceOwner: string,
    resource: string,
    { rules, isAllowed }: RepositoryTokenAuthorizationResourceResult,
  ): string {
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;
    const renderedResource = renderResource(resourceOwner, resource);
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";
    const basedOn =
      ruleCount < 1
        ? "(no matching rules)"
        : `based on ${ruleCount} ${ruleOrRules}`;

    return (
      `  ${icon} ${isAllowed ? "Sufficient" : "Insufficient"} ` +
      `access to ${renderedResource} ${basedOn}`
    );
  }

  function explainRule(
    want: InstallationPermissions,
    {
      index,
      rule,
      have,
      isAllowed,
    }: RepositoryTokenAuthorizationResourceResultRuleResult,
  ): string {
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `    ${icon} Rule ${renderRule(index, rule)} ` +
      `gave ${isAllowed ? "sufficient" : "insufficient"} access:` +
      renderPermissionComparison("      ", have, want)
    );
  }

  function renderResource(resourceOwner: string, resource: string): string {
    return resource === "*"
      ? `all repos in ${resourceOwner}`
      : `repo ${resource}`;
  }

  function renderRule(
    index: number,
    { description }: RepositoryPermissionRule,
  ): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }

  function renderAllowDenyList(
    indent: string,
    items: [boolean, string][],
  ): string {
    let list = "";
    for (const [isAllowed, entry] of items)
      list += `\n${indent}${isAllowed ? ALLOWED_ICON : DENIED_ICON} ${entry}`;

    return list;
  }

  function renderPermissionComparison(
    indent: string,
    have: InstallationPermissions,
    want: InstallationPermissions,
  ): string {
    const entries: [boolean, string][] = [];
    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = have[p];
      const w = want[p];

      entries.push([
        isSufficientAccess(h, w),
        `${p}: have ${h ?? "none"}, wanted ${w}`,
      ]);
    }

    return renderAllowDenyList(indent, entries);
  }
}
