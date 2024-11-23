import { isSufficientAccess } from "../access-level.js";
import type { InstallationPermissions } from "../type/github-api.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
import type {
  RepoTokenAuthorizationResourceResult,
  RepoTokenAuthorizationResourceResultRuleResult,
  RepoTokenAuthorizationResult,
  RepoTokenAuthorizationResultAllRepos,
  RepoTokenAuthorizationResultExplainer,
  RepoTokenAuthorizationResultNoRepos,
  RepoTokenAuthorizationResultSelectedRepos,
} from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextRepoAuthExplainer(): RepoTokenAuthorizationResultExplainer<string> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(
    result: RepoTokenAuthorizationResultAllRepos,
  ): string {
    const { account, isAllowed, rules, want } = result;
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `${explainSummary(result)}\n` +
      `  ${icon} ${isAllowed ? "Sufficient" : "Insufficient"} ` +
      `access to all repos in ${account} ${explainBasedOnRules(want, rules)}`
    );
  }

  function explainNoRepos(result: RepoTokenAuthorizationResultNoRepos): string {
    const { account, isAllowed, rules, want } = result;
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `${explainSummary(result)}\n` +
      `  ${icon} ${isAllowed ? "Sufficient" : "Insufficient"} ` +
      `access to ${account} ${explainBasedOnRules(want, rules)}`
    );
  }

  function explainSelectedRepos(
    result: RepoTokenAuthorizationResultSelectedRepos,
  ): string {
    const { results, want } = result;
    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    let explainedResources = "";

    for (const [resourceRepo, resourceResult] of resourceEntries) {
      explainedResources +=
        "\n" + explainResourceRepo(resourceRepo, want, resourceResult);
    }

    return explainSummary(result) + explainedResources;
  }

  function explainSummary({
    consumer,
    isAllowed,
  }: RepoTokenAuthorizationResult): string {
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `${icon} Repo ${consumer} ` +
      `was ${isAllowed ? "allowed" : "denied"} access to a token:`
    );
  }

  function explainResourceRepo(
    resource: string,
    want: InstallationPermissions,
    { isAllowed, rules }: RepoTokenAuthorizationResourceResult,
  ): string {
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `  ${icon} ${isAllowed ? "Sufficient" : "Insufficient"} ` +
      `access to repo ${resource} ${explainBasedOnRules(want, rules)}`
    );
  }

  function explainBasedOnRules(
    want: InstallationPermissions,
    rules: RepoTokenAuthorizationResourceResultRuleResult[],
  ): string {
    const ruleCount = rules.length;
    const ruleOrRules = ruleCount === 1 ? "rule" : "rules";
    const basedOn =
      ruleCount < 1
        ? "(no matching rules)"
        : `based on ${ruleCount} ${ruleOrRules}`;

    if (ruleCount < 1) return basedOn;

    let explainedRules = "";
    for (const ruleResult of rules) {
      explainedRules += "\n" + explainRule(want, ruleResult);
    }

    return `${basedOn}:${explainedRules}`;
  }

  function explainRule(
    want: InstallationPermissions,
    {
      index,
      rule,
      have,
      isAllowed,
    }: RepoTokenAuthorizationResourceResultRuleResult,
  ): string {
    const icon = isAllowed ? ALLOWED_ICON : DENIED_ICON;

    return (
      `    ${icon} Rule ${renderRule(index, rule)} ` +
      `gave ${isAllowed ? "sufficient" : "insufficient"} access:` +
      renderPermissionComparison("      ", have, want)
    );
  }

  function renderRule(index: number, { description }: PermissionsRule): string {
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
