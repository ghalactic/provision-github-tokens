import { isWriteAccess, maxAccess } from "./access-level.js";
import { createGitHubPattern } from "./github-pattern.js";
import {
  accountOrRepoRefToString,
  createRepoRef,
  repoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import { createNamePattern } from "./name-pattern.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import { isEmptyPermissions, isSufficientPermissions } from "./permissions.js";
import type {
  PermissionsRule,
  PermissionsRuleResourceCriteria,
} from "./type/permissions-rule.js";
import type { Permissions } from "./type/permissions.js";
import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import {
  type TokenAuthResourceResult,
  type TokenAuthResourceResultRuleResult,
  type TokenAuthResult,
} from "./type/token-auth-result.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  /**
   * Authorize a token.
   */
  authorizeToken: (request: TokenRequest) => TokenAuthResult;
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  const [resourcePatterns, consumerPatterns] = patternsForRules(config.rules);

  return {
    authorizeToken(request) {
      if (isEmptyPermissions(request.tokenDec.permissions)) {
        throw new Error("No permissions requested");
      }

      if (request.tokenDec.repos === "all") {
        return authorizeAllRepos(request);
      }
      if (request.tokenDec.repos.length < 1) {
        return authorizeNoRepos(request);
      }
      return authorizeSelectedRepos(request);
    },
  };

  function authorizeAllRepos(request: TokenRequest): TokenAuthResult {
    const rules = rulesForConsumer(request.consumer);
    let isSufficient = false;

    const ruleResults: TokenAuthResourceResultRuleResult[] = [];
    const have: Permissions = {};

    for (const i of rules) {
      const rule = config.rules[i];
      let isRelevant = false;

      for (let j = 0; j < rule.resources.length; ++j) {
        isRelevant =
          rule.resources[j].allRepos === true &&
          anyPatternMatches(
            resourcePatterns[i][j].accounts,
            request.tokenDec.account,
          );

        if (isRelevant) break;
      }

      if (!isRelevant) continue;

      updatePermissions(have, rule.permissions);

      // Token is allowed if last rule is allowed
      isSufficient = isSufficientPermissions(
        have,
        request.tokenDec.permissions,
      );

      ruleResults.push({
        index: i,
        rule,
        have: structuredClone(have),
        isSufficient,
      });
    }

    const maxWant = maxAccess(request.tokenDec.permissions);
    const isWrite = isWriteAccess(maxWant);
    const isMissingRole = isWrite && !request.tokenDec.as;
    const isAllowed = isSufficient && !isMissingRole;

    return {
      request,
      type: "ALL_REPOS",
      rules: ruleResults,
      have,
      maxWant,
      isSufficient,
      isMissingRole,
      isAllowed,
    };
  }

  function authorizeNoRepos(request: TokenRequest): TokenAuthResult {
    const rules = rulesForConsumer(request.consumer);
    let isSufficient = false;

    const ruleResults: TokenAuthResourceResultRuleResult[] = [];
    const have: Permissions = {};

    for (const i of rules) {
      const rule = config.rules[i];
      let isRelevant = false;

      for (let j = 0; j < rule.resources.length; ++j) {
        isRelevant =
          rule.resources[j].noRepos === true &&
          anyPatternMatches(
            resourcePatterns[i][j].accounts,
            request.tokenDec.account,
          );

        if (isRelevant) break;
      }

      if (!isRelevant) continue;

      updatePermissions(have, rule.permissions);

      // Token is allowed if last rule is allowed
      isSufficient = isSufficientPermissions(
        have,
        request.tokenDec.permissions,
      );

      ruleResults.push({
        index: i,
        rule,
        have: structuredClone(have),
        isSufficient,
      });
    }

    const maxWant = maxAccess(request.tokenDec.permissions);
    const isWrite = isWriteAccess(maxWant);
    const isMissingRole = isWrite && !request.tokenDec.as;
    const isAllowed = isSufficient && !isMissingRole;

    return {
      request,
      type: "NO_REPOS",
      rules: ruleResults,
      have,
      maxWant,
      isSufficient,
      isMissingRole,
      isAllowed,
    };
  }

  function authorizeSelectedRepos(request: TokenRequest): TokenAuthResult {
    const rules = rulesForConsumer(request.consumer);
    let isSufficient = true;

    const resourceResults: Record<string, TokenAuthResourceResult> = {};

    for (const reqRepo of request.repos) {
      const reqResource = repoRefToString(
        createRepoRef(request.tokenDec.account, reqRepo),
      );
      const ruleResults: TokenAuthResourceResultRuleResult[] = [];
      const have: Permissions = {};
      let isResourceSufficient = false;

      for (const i of rules) {
        const rule = config.rules[i];
        let isRelevant = false;

        for (let j = 0; j < rule.resources.length; ++j) {
          const { accounts, repos } = resourcePatterns[i][j];
          isRelevant =
            anyPatternMatches(accounts, request.tokenDec.account) &&
            anyPatternMatches(repos, reqRepo);

          if (isRelevant) break;
        }

        if (!isRelevant) continue;

        updatePermissions(have, rule.permissions);

        // Resource is allowed if last rule is allowed
        isResourceSufficient = isSufficientPermissions(
          have,
          request.tokenDec.permissions,
        );

        ruleResults.push({
          index: i,
          rule,
          have: structuredClone(have),
          isSufficient: isResourceSufficient,
        });
      }

      // Token is allowed if all resources are allowed
      isSufficient &&= isResourceSufficient;
      resourceResults[reqResource] = {
        rules: ruleResults,
        have,
        isSufficient: isResourceSufficient,
      };
    }

    const maxWant = maxAccess(request.tokenDec.permissions);
    const isWrite = isWriteAccess(maxWant);
    const isMissingRole = isWrite && !request.tokenDec.as;
    const isMatched = request.repos.length > 0;
    const isAllowed = isSufficient && !isMissingRole && isMatched;

    return {
      request,
      type: "SELECTED_REPOS",
      results: resourceResults,
      maxWant,
      isSufficient,
      isMissingRole,
      isMatched,
      isAllowed,
    };
  }

  function patternsForRules(
    rules: PermissionsRule[],
  ): [Record<number, ResourceCriteriaPatterns[]>, Record<number, Pattern[]>] {
    const resourcePatterns: Record<number, ResourceCriteriaPatterns[]> = {};
    const consumerPatterns: Record<number, Pattern[]> = {};

    for (let i = 0; i < rules.length; ++i) {
      [resourcePatterns[i], consumerPatterns[i]] = patternsForRule(rules[i]);
    }

    return [resourcePatterns, consumerPatterns];
  }

  function patternsForRule(
    rule: PermissionsRule,
  ): [
    resourcePatterns: ResourceCriteriaPatterns[],
    consumerPatterns: Pattern[],
  ] {
    const resourcePatterns: ResourceCriteriaPatterns[] = [];
    const consumerPatterns: Pattern[] = [];

    for (const criteria of rule.resources) {
      resourcePatterns.push(patternsForResourceCriteria(criteria));
    }
    for (const consumer of rule.consumers) {
      consumerPatterns.push(createGitHubPattern(consumer));
    }

    return [resourcePatterns, consumerPatterns];
  }

  function patternsForResourceCriteria(
    criteria: PermissionsRuleResourceCriteria,
  ): ResourceCriteriaPatterns {
    const accounts: Pattern[] = [];
    const repos: Pattern[] = [];

    for (const pattern of criteria.accounts) {
      accounts.push(createNamePattern(pattern));
    }
    for (const pattern of criteria.selectedRepos) {
      repos.push(createNamePattern(pattern));
    }

    return { accounts, repos };
  }

  function rulesForConsumer(consumer: AccountOrRepoReference): number[] {
    const consumerName = accountOrRepoRefToString(consumer);
    const indices: number[] = [];

    for (let i = 0; i < config.rules.length; ++i) {
      if (anyPatternMatches(consumerPatterns[i], consumerName)) {
        indices.push(i);
      }
    }

    return indices;
  }

  function updatePermissions(
    have: Permissions,
    permissions: Permissions,
  ): void {
    Object.assign(have, permissions);

    for (const [permission, access = "none"] of Object.entries(have)) {
      if (access === "none") delete have[permission];
    }
  }
}

type ResourceCriteriaPatterns = {
  accounts: Pattern[];
  repos: Pattern[];
};
