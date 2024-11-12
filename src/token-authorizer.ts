import { isSufficientAccess } from "./access-level.js";
import {
  anyGitHubPatternIsAllRepos,
  createGitHubPattern,
  gitHubPatternsForAccount,
  type GitHubPattern,
} from "./github-pattern.js";
import { anyPatternMatches } from "./pattern.js";
import { isSufficientPermissions } from "./permissions.js";
import type {
  InstallationPermissions,
  InstallationPermissionsWithNone,
} from "./type/github-api.js";
import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import type {
  RepoTokenAuthorizationResourceResult,
  RepoTokenAuthorizationResourceResultRuleResult,
  RepoTokenAuthorizationResult,
} from "./type/token-auth-result.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  /**
   * Authorize a token request for a single consuming repo.
   */
  authorizeForRepo: (
    consumerAccount: string,
    consumerRepo: string,
    request: TokenRequest,
  ) => RepoTokenAuthorizationResult;
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  const repoResourcePatterns: Record<number, GitHubPattern[]> = {};
  const repoConsumerPatterns: Record<number, GitHubPattern[]> = {};

  for (let i = 0; i < config.rules.length; ++i) {
    const resourcePatterns: GitHubPattern[] = [];
    const consumerPatterns: GitHubPattern[] = [];

    for (const resource of config.rules[i].resources) {
      resourcePatterns.push(createGitHubPattern(resource));
    }
    for (const consumer of config.rules[i].consumers) {
      consumerPatterns.push(createGitHubPattern(consumer));
    }

    repoResourcePatterns[i] = resourcePatterns;
    repoConsumerPatterns[i] = consumerPatterns;
  }

  return {
    authorizeForRepo(consumerAccount, consumerRepo, request) {
      const want = request.permissions;
      const isAllRepos = request.repos === "all";

      if (!isAllRepos && request.repos.length < 1) {
        throw new Error("No repos requested");
      }
      if (Object.keys(want).length < 1) {
        throw new Error("No permissions requested");
      }

      const consumer = `${consumerAccount}/${consumerRepo}`;
      const resourceAccount = request.account;
      const rules = rulesForConsumer(consumer);
      let isAllowed = true;

      if (isAllRepos) {
        const ruleResults: RepoTokenAuthorizationResourceResultRuleResult[] =
          [];
        const have: InstallationPermissions = {};

        for (const i of rules) {
          const rule = config.rules[i];
          const patternsForAccount = gitHubPatternsForAccount(
            resourceAccount,
            repoResourcePatterns[i],
          );
          let isRelevant: boolean;

          if (patternsForAccount.length > 0) {
            if (anyGitHubPatternIsAllRepos(patternsForAccount)) {
              updatePermissions(have, rule.permissions);
              isRelevant = true;
            } else {
              isRelevant = reducePermissions(have, rule.permissions);
            }
          } else {
            isRelevant = false;
          }

          // Token is allowed if last rule is allowed
          isAllowed = isSufficientPermissions(have, want);

          if (!isRelevant) continue;

          ruleResults.push({
            index: i,
            rule,
            have: structuredClone(have),
            isAllowed,
          });
        }

        return {
          consumer,
          resourceAccount,
          resources: {
            "*": {
              rules: ruleResults,
              have,
              isAllowed,
            },
          },
          want,
          isAllowed,
        };
      }

      const resourceResults: Record<
        string,
        RepoTokenAuthorizationResourceResult
      > = {};

      for (const resourceRepo of request.repos) {
        const resource = `${resourceAccount}/${resourceRepo}`;
        const ruleResults: RepoTokenAuthorizationResourceResultRuleResult[] =
          [];
        const have: InstallationPermissions = {};
        let isResourceAllowed = false;

        for (const i of rules) {
          if (!anyPatternMatches(repoResourcePatterns[i], resource)) continue;

          const rule = config.rules[i];
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
        consumer,
        resourceAccount,
        resources: resourceResults,
        want,
        isAllowed,
      };
    },
  };

  function rulesForConsumer(consumer: string): number[] {
    const indices: number[] = [];

    for (let i = 0; i < config.rules.length; ++i) {
      if (anyPatternMatches(repoConsumerPatterns[i], consumer)) indices.push(i);
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

  function reducePermissions(
    have: InstallationPermissions,
    boundary: InstallationPermissionsWithNone,
  ): boolean {
    let wasReduced = false;

    for (let permission of Object.keys(have)) {
      // Boundary doesn't constrain access
      if (!(permission in boundary)) continue;

      const maxAccess = boundary[permission];

      if (maxAccess === "none") {
        // Boundary removes access
        delete have[permission];
        wasReduced = true;
      } else if (!isSufficientAccess(maxAccess, have[permission])) {
        // Boundary reduces access
        have[permission] = maxAccess;
        wasReduced = true;
      }
    }

    return wasReduced;
  }
}
