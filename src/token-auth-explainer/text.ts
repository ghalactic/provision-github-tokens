import { isSufficientAccess } from "../access-level.js";
import { accountOrRepoRefToString, isRepoRef } from "../github-reference.js";
import { permissionAccess } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
import type { PermissionAccess, Permissions } from "../type/permissions.js";
import type {
  TokenAuthResourceResult,
  TokenAuthResourceResultRuleResult,
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultExplainer,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

const ACCESS_LEVELS: Record<PermissionAccess, string> = {
  none: "No",
  admin: "Admin",
  read: "Read",
  write: "Write",
};

export function createTextTokenAuthExplainer(): TokenAuthResultExplainer<string> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): string {
    const { request, isSufficient, rules } = result;
    const subject = `all repos in ${request.declaration.account}`;

    return (
      `${explainSummary(result)}\n  ` +
      `${explainMaxAccessAndRole(result, subject)}\n  ` +
      `${renderIcon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to ${subject} ` +
      `${explainBasedOnRules(request.declaration.permissions, rules)}`
    );
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): string {
    const { request, isSufficient, rules } = result;

    return (
      `${explainSummary(result)}\n  ` +
      `${explainMaxAccessAndRole(result, request.declaration.account)}\n  ` +
      `${renderIcon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to ${request.declaration.account} ` +
      `${explainBasedOnRules(request.declaration.permissions, rules)}`
    );
  }

  function explainSelectedRepos(result: TokenAuthResultSelectedRepos): string {
    const { request, results } = result;
    const subject = `repos in ${request.declaration.account}`;

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    let explainedResources = "";

    for (const [resourceRepo, resourceResult] of resourceEntries) {
      explainedResources +=
        "\n" +
        explainResourceRepo(
          resourceRepo,
          request.declaration.permissions,
          resourceResult,
        );
    }

    return (
      `${explainSummary(result)}\n  ` +
      `${explainMaxAccessAndRole(result, subject)}\n  ` +
      `${explainSelectedReposMatch(result)}` +
      explainedResources
    );
  }

  function explainSummary({ request, isAllowed }: TokenAuthResult): string {
    const name = accountOrRepoRefToString(request.consumer);

    if (isRepoRef(request.consumer)) {
      return (
        `${renderIcon(isAllowed)} Repo ${name} ` +
        `was ${isAllowed ? "allowed" : "denied"} access to a token:`
      );
    }

    return (
      `${renderIcon(isAllowed)} Account ${name} ` +
      `was ${isAllowed ? "allowed" : "denied"} access to a token:`
    );
  }

  function explainMaxAccessAndRole(
    { request, maxWant, isMissingRole }: TokenAuthResult,
    accessTo: string,
  ): string {
    return (
      `${renderIcon(!isMissingRole)} ${ACCESS_LEVELS[maxWant]} ` +
      `access to ${accessTo} ` +
      (request.declaration.as
        ? `requested with role ${request.declaration.as}`
        : "requested without a role")
    );
  }

  function explainSelectedReposMatch({
    request,
    isMatched,
  }: TokenAuthResultSelectedRepos): string {
    const repoPatterns = pluralize(
      request.declaration.repos.length,
      "repo pattern",
      "repo patterns",
    );
    const repos = pluralize(request.repos.length, "repo", "repos");

    return `${renderIcon(isMatched)} ${repoPatterns} matched ${repos}`;
  }

  function explainResourceRepo(
    resource: string,
    want: Permissions,
    { isSufficient, rules }: TokenAuthResourceResult,
  ): string {
    return (
      `  ${renderIcon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to repo ${resource} ${explainBasedOnRules(want, rules)}`
    );
  }

  function explainBasedOnRules(
    want: Permissions,
    rules: TokenAuthResourceResultRuleResult[],
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
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): string {
    return (
      `    ${renderIcon(isSufficient)} Rule ${renderRule(index, rule)} ` +
      `gave ${isSufficient ? "sufficient" : "insufficient"} access:` +
      renderPermissionComparison("      ", have, want)
    );
  }

  function renderRule(index: number, { description }: PermissionsRule): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }

  function renderPermissionComparison(
    indent: string,
    have: Permissions,
    want: Permissions,
  ): string {
    const entries: [boolean, string][] = [];

    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = permissionAccess(have, p);
      const w = permissionAccess(want, p);

      entries.push([isSufficientAccess(h, w), `${p}: have ${h}, wanted ${w}`]);
    }

    return renderAllowDenyList(indent, entries);
  }

  function renderAllowDenyList(
    indent: string,
    items: [boolean, string][],
  ): string {
    let list = "";

    for (const [isAllowed, entry] of items) {
      list += `\n${indent}${renderIcon(isAllowed)} ${entry}`;
    }

    return list;
  }

  function renderIcon(isAllowed: boolean): string {
    return isAllowed ? ALLOWED_ICON : DENIED_ICON;
  }
}
