import { createGitHubPattern, type GitHubPattern } from "./github-pattern.js";
import { createNamePattern } from "./name-pattern.js";
import { anyPatternMatches, type Pattern } from "./pattern.js";
import { isSufficientPermissions } from "./permissions.js";
import type {
  InstallationPermissions,
  InstallationPermissionsWithNone,
} from "./type/github-api.js";
import type {
  PermissionsRule,
  PermissionsRuleResourceCriteria,
} from "./type/permissions-rule.js";
import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import {
  type RepoTokenAuthorizationResourceResult,
  type RepoTokenAuthorizationResourceResultRuleResult,
  type RepoTokenAuthorizationResult,
} from "./type/token-auth-result.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  /**
   * Authorize a token request for a single consuming repo.
   */
  authorizeForRepo: (
    consumer: string,
    request: TokenRequest,
  ) => RepoTokenAuthorizationResult;
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  const [resourcePatterns, consumerPatterns] = patternsForRules(config.rules);

  return {
    authorizeForRepo(consumer, request) {
      const want = request.permissions;

      if (Object.keys(want).length < 1) {
        throw new Error("No permissions requested");
      }

      if (request.repos === "all") {
        return authorizeAllReposForRepo(consumer, request);
      }
      if (request.repos.length < 1) {
        return authorizeNoReposForRepo(consumer, request);
      }

      return authorizeSelectedReposForRepo(consumer, request);
    },
  };

  function authorizeAllReposForRepo(
    consumer: string,
    request: TokenRequest,
  ): RepoTokenAuthorizationResult {
    const { account: resourceAccount, permissions: want } = request;
    const rules = rulesForConsumer(consumer);
    let isAllowed = false;

    const ruleResults: RepoTokenAuthorizationResourceResultRuleResult[] = [];
    const have: InstallationPermissions = {};

    for (const i of rules) {
      const rule = config.rules[i];
      let isRelevant = false;

      for (let j = 0; j < rule.resources.length; ++j) {
        isRelevant =
          rule.resources[j].allRepos === true &&
          anyPatternMatches(resourcePatterns[i][j].accounts, resourceAccount);

        if (isRelevant) break;
      }

      if (!isRelevant) continue;

      updatePermissions(have, rule.permissions);

      // Token is allowed if last rule is allowed
      isAllowed = isSufficientPermissions(have, want);

      ruleResults.push({
        index: i,
        rule,
        have: structuredClone(have),
        isAllowed,
      });
    }

    return {
      type: "ALL_REPOS",
      consumer,
      account: resourceAccount,
      rules: ruleResults,
      have,
      want,
      isAllowed,
    };
  }

  function authorizeNoReposForRepo(
    consumer: string,
    request: TokenRequest,
  ): RepoTokenAuthorizationResult {
    const { account: resourceAccount, permissions: want } = request;
    const rules = rulesForConsumer(consumer);
    let isAllowed = false;

    const ruleResults: RepoTokenAuthorizationResourceResultRuleResult[] = [];
    const have: InstallationPermissions = {};

    for (const i of rules) {
      const rule = config.rules[i];
      let isRelevant = false;

      for (let j = 0; j < rule.resources.length; ++j) {
        isRelevant =
          rule.resources[j].noRepos === true &&
          anyPatternMatches(resourcePatterns[i][j].accounts, resourceAccount);

        if (isRelevant) break;
      }

      if (!isRelevant) continue;

      updatePermissions(have, rule.permissions);

      // Token is allowed if last rule is allowed
      isAllowed = isSufficientPermissions(have, want);

      ruleResults.push({
        index: i,
        rule,
        have: structuredClone(have),
        isAllowed,
      });
    }

    return {
      type: "NO_REPOS",
      consumer,
      account: resourceAccount,
      rules: ruleResults,
      have,
      want,
      isAllowed,
    };
  }

  function authorizeSelectedReposForRepo(
    consumer: string,
    request: TokenRequest,
  ): RepoTokenAuthorizationResult {
    const { account: resourceAccount, permissions: want } = request;
    const rules = rulesForConsumer(consumer);
    let isAllowed = true;

    const resourceResults: Record<
      string,
      RepoTokenAuthorizationResourceResult
    > = {};

    for (const resourceRepo of request.repos) {
      const resource = `${resourceAccount}/${resourceRepo}`;
      const ruleResults: RepoTokenAuthorizationResourceResultRuleResult[] = [];
      const have: InstallationPermissions = {};
      let isResourceAllowed = false;

      for (const i of rules) {
        const rule = config.rules[i];
        let isRelevant = false;

        for (let j = 0; j < rule.resources.length; ++j) {
          const { accounts, selectedRepos } = resourcePatterns[i][j];
          isRelevant =
            anyPatternMatches(accounts, resourceAccount) &&
            anyPatternMatches(selectedRepos, resourceRepo);

          if (isRelevant) break;
        }

        if (!isRelevant) continue;

        updatePermissions(have, rule.permissions);

        // Resource is allowed if last rule is allowed
        isResourceAllowed = isSufficientPermissions(have, want);

        ruleResults.push({
          index: i,
          rule,
          have: structuredClone(have),
          isAllowed: isResourceAllowed,
        });
      }

      // Token is allowed if all resources are allowed
      isAllowed &&= isResourceAllowed;
      resourceResults[resource] = {
        rules: ruleResults,
        have,
        isAllowed: isResourceAllowed,
      };
    }

    return {
      type: "SELECTED_REPOS",
      consumer,
      account: resourceAccount,
      results: resourceResults,
      want,
      isAllowed,
    };
  }

  function patternsForRules(
    rules: PermissionsRule[],
  ): [
    Record<number, ResourceCriteriaPatterns[]>,
    Record<number, GitHubPattern[]>,
  ] {
    const resourcePatterns: Record<number, ResourceCriteriaPatterns[]> = {};
    const consumerPatterns: Record<number, GitHubPattern[]> = {};

    for (let i = 0; i < rules.length; ++i) {
      [resourcePatterns[i], consumerPatterns[i]] = patternsForRule(rules[i]);
    }

    return [resourcePatterns, consumerPatterns];
  }

  function patternsForRule(
    rule: PermissionsRule,
  ): [ResourceCriteriaPatterns[], GitHubPattern[]] {
    const resourcePatterns: ResourceCriteriaPatterns[] = [];
    const consumerPatterns: GitHubPattern[] = [];

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
    const selectedRepos: Pattern[] = [];

    for (const pattern of criteria.accounts) {
      accounts.push(createNamePattern(pattern));
    }
    for (const pattern of criteria.selectedRepos) {
      selectedRepos.push(createNamePattern(pattern));
    }

    return { accounts, selectedRepos };
  }

  function rulesForConsumer(consumer: string): number[] {
    const indices: number[] = [];

    for (let i = 0; i < config.rules.length; ++i) {
      if (anyPatternMatches(consumerPatterns[i], consumer)) indices.push(i);
    }

    return indices;
  }

  function updatePermissions(
    have: InstallationPermissions,
    permissions: InstallationPermissionsWithNone,
  ): void {
    for (let [permission, access] of Object.entries(permissions)) {
      if (access === "none") {
        delete have[permission];
      } else {
        have[permission] = access;
      }
    }
  }
}

type ResourceCriteriaPatterns = {
  accounts: Pattern[];
  selectedRepos: Pattern[];
};
