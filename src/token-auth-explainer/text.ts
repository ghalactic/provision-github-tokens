import { isSufficientAccess } from "../access-level.js";
import type {
  InstallationPermissions,
  PermissionAccess,
} from "../type/github-api.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
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
  admin: "Admin",
  read: "Read",
  write: "Write",
};

export function createTextAuthExplainer(): TokenAuthResultExplainer<string> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): string {
    const { request, isSufficient, rules } = result;
    const { account } = request;
    const subject = `all repos in ${account}`;

    return (
      `${explainSummary(result)}\n  ` +
      `${explainMaxAccessAndRole(result, subject)}\n  ` +
      `${renderIcon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to ${subject} ${explainBasedOnRules(request.permissions, rules)}`
    );
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): string {
    const { request, isSufficient, rules } = result;
    const { account } = request;

    return (
      `${explainSummary(result)}\n  ` +
      `${explainMaxAccessAndRole(result, account)}\n  ` +
      `${renderIcon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to ${account} ${explainBasedOnRules(request.permissions, rules)}`
    );
  }

  function explainSelectedRepos(result: TokenAuthResultSelectedRepos): string {
    const { request, results } = result;
    const { account } = request;
    const subject = `repos in ${account}`;

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    let explainedResources = "";

    for (const [resourceRepo, resourceResult] of resourceEntries) {
      explainedResources +=
        "\n" +
        explainResourceRepo(resourceRepo, request.permissions, resourceResult);
    }

    return (
      `${explainSummary(result)}\n  ` +
      `${explainMaxAccessAndRole(result, subject)}` +
      explainedResources
    );
  }

  function explainSummary({
    consumer: { type, name },
    isAllowed,
  }: TokenAuthResult): string {
    if (type === "REPO") {
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
    const { role } = request;

    return (
      `${renderIcon(!isMissingRole)} ${ACCESS_LEVELS[maxWant]} ` +
      `access to ${accessTo} ` +
      (role
        ? `was requested with role ${role}`
        : "was requested without a role")
    );
  }

  function explainResourceRepo(
    resource: string,
    want: InstallationPermissions,
    { isSufficient, rules }: TokenAuthResourceResult,
  ): string {
    return (
      `  ${renderIcon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to repo ${resource} ${explainBasedOnRules(want, rules)}`
    );
  }

  function explainBasedOnRules(
    want: InstallationPermissions,
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
    want: InstallationPermissions,
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
