import { isSufficientAccess } from "../access-level.js";
import { accountOrRepoRefToString, isRepoRef } from "../github-reference.js";
import { icon } from "../icon.js";
import { permissionAccess } from "../permissions.js";
import { pluralize } from "../pluralize.js";
import type { PermissionsRule } from "../type/permissions-rule.js";
import type { Permissions } from "../type/permissions.js";
import type {
  TokenAuthResourceResult,
  TokenAuthResourceResultRuleResult,
  TokenAuthResult,
  TokenAuthResultAllRepos,
  TokenAuthResultExplainer,
  TokenAuthResultNoRepos,
  TokenAuthResultSelectedRepos,
} from "../type/token-auth-result.js";
import { ACCESS_LEVEL_LABELS } from "./access-level.js";

export function createTextTokenAuthExplainer(): TokenAuthResultExplainer<string> {
  return (result) => {
    if (result.type === "ALL_REPOS") return explainAllRepos(result);
    if (result.type === "NO_REPOS") return explainNoRepos(result);

    return explainSelectedRepos(result);
  };

  function explainAllRepos(result: TokenAuthResultAllRepos): string {
    const { request, isSufficient, rules } = result;
    const subject = `all repos in ${request.tokenDec.account}`;

    return (
      explainSummary(result) +
      explainMaxAccessAndRole(result, subject) +
      explainBasedOnRules(
        isSufficient,
        subject,
        request.tokenDec.permissions,
        rules,
      )
    );
  }

  function explainNoRepos(result: TokenAuthResultNoRepos): string {
    const { request, isSufficient, rules } = result;

    return (
      explainSummary(result) +
      explainMaxAccessAndRole(result, request.tokenDec.account) +
      explainBasedOnRules(
        isSufficient,
        request.tokenDec.account,
        request.tokenDec.permissions,
        rules,
      )
    );
  }

  function explainSelectedRepos(result: TokenAuthResultSelectedRepos): string {
    const { request, results } = result;
    const subject = `repos in ${request.tokenDec.account}`;

    const resourceEntries = Object.entries(results).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    let explainedResources = "";

    for (const [resourceRepo, resourceResult] of resourceEntries) {
      explainedResources += explainResourceRepo(
        resourceRepo,
        request.tokenDec.permissions,
        resourceResult,
      );
    }

    return (
      explainSummary(result) +
      explainMaxAccessAndRole(result, subject) +
      explainSelectedReposMatch(result) +
      explainedResources
    );
  }

  function explainSummary({ request, isAllowed }: TokenAuthResult): string {
    const name = accountOrRepoRefToString(request.consumer);

    if (isRepoRef(request.consumer)) {
      return (
        `${icon(isAllowed)} Repo ${name} ` +
        `was ${isAllowed ? "allowed" : "denied"} access to a token:`
      );
    }

    return (
      `${icon(isAllowed)} Account ${name} ` +
      `was ${isAllowed ? "allowed" : "denied"} access to a token:`
    );
  }

  function explainMaxAccessAndRole(
    { request, maxWant, isMissingRole }: TokenAuthResult,
    accessTo: string,
  ): string {
    return (
      `\n  ${icon(!isMissingRole)} ${ACCESS_LEVEL_LABELS[maxWant]} ` +
      `access to ${accessTo} ` +
      (request.tokenDec.as
        ? `requested with role ${request.tokenDec.as}`
        : "requested without a role")
    );
  }

  function explainSelectedReposMatch({
    request,
    isMatched,
  }: TokenAuthResultSelectedRepos): string {
    const repoPatterns = pluralize(
      request.tokenDec.repos.length,
      "repo pattern",
      "repo patterns",
    );
    const repos = pluralize(request.repos.length, "repo", "repos");

    return `\n  ${icon(isMatched)} ${repoPatterns} matched ${repos}`;
  }

  function explainResourceRepo(
    resource: string,
    want: Permissions,
    { isSufficient, rules }: TokenAuthResourceResult,
  ): string {
    return explainBasedOnRules(isSufficient, `repo ${resource}`, want, rules);
  }

  function explainBasedOnRules(
    isSufficient: boolean,
    accessTo: string,
    want: Permissions,
    rules: TokenAuthResourceResultRuleResult[],
  ): string {
    const ruleCount = rules.length;
    const summary =
      `\n  ${icon(isSufficient)} ` +
      `${isSufficient ? "Sufficient" : "Insufficient"} ` +
      `access to ${accessTo} ` +
      (ruleCount < 1
        ? "(no matching rules)"
        : `based on ${pluralize(ruleCount, "rule", "rules")}:`);

    if (ruleCount < 1) return summary;

    let explainedRules = "";

    for (const ruleResult of rules) {
      explainedRules += explainRule(want, ruleResult);
    }

    return `${summary}${explainedRules}`;
  }

  function explainRule(
    want: Permissions,
    { index, rule, have, isSufficient }: TokenAuthResourceResultRuleResult,
  ): string {
    return (
      `\n    ${icon(isSufficient)} Rule ${renderRule(index, rule)} ` +
      `gave ${isSufficient ? "sufficient" : "insufficient"} access:` +
      renderPermissionComparison(have, want)
    );
  }

  function renderRule(index: number, { description }: PermissionsRule): string {
    const n = `#${index + 1}`;

    return description ? `${n}: ${JSON.stringify(description)}` : n;
  }

  function renderPermissionComparison(
    have: Permissions,
    want: Permissions,
  ): string {
    let comparison = "";

    for (const p of Object.keys(want).sort((a, b) => a.localeCompare(b))) {
      const h = permissionAccess(have, p);
      const w = permissionAccess(want, p);

      comparison +=
        `\n      ${icon(isSufficientAccess(h, w))} ${p}: ` +
        `have ${h}, wanted ${w}`;
    }

    return comparison;
  }
}
