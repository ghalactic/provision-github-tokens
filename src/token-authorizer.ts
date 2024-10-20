import { isSufficientAccess } from "./access-level.js";
import { anyPatternMatches } from "./pattern.js";
import { isSufficientPermissions } from "./permissions.js";
import {
  anyRepoPatternIsAllRepos,
  createRepoPattern,
  repoPatternsForOwner,
  type RepoPattern,
} from "./repo-pattern.js";
import type {
  InstallationPermissions,
  InstallationPermissionsWithNone,
} from "./type/github-api.js";
import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import type {
  RepositoryTokenAuthorizationResourceResult,
  RepositoryTokenAuthorizationResourceResultRuleResult,
  RepositoryTokenAuthorizationResult,
} from "./type/token-auth-result.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  /**
   * Authorize a token request for a single consuming repository.
   */
  authorizeForRepository: (
    consumerOwner: string,
    consumerRepo: string,
    request: TokenRequest,
  ) => RepositoryTokenAuthorizationResult;
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  const repoResourcePatterns: Record<number, RepoPattern[]> = {};
  const repoConsumerPatterns: Record<number, RepoPattern[]> = {};

  for (let i = 0; i < config.rules.repositories.length; ++i) {
    const resourcePatterns: RepoPattern[] = [];
    const consumerPatterns: RepoPattern[] = [];

    for (const resource of config.rules.repositories[i].resources) {
      resourcePatterns.push(createRepoPattern(resource));
    }
    for (const consumer of config.rules.repositories[i].consumers) {
      consumerPatterns.push(createRepoPattern(consumer));
    }

    repoResourcePatterns[i] = resourcePatterns;
    repoConsumerPatterns[i] = consumerPatterns;
  }

  return {
    authorizeForRepository(consumerOwner, consumerRepo, request) {
      const want = request.permissions;
      const isAllRepos = request.repositories === "all";

      if (!isAllRepos && request.repositories.length < 1) {
        throw new Error("No repositories requested");
      }
      if (Object.keys(want).length < 1) {
        throw new Error("No permissions requested");
      }

      const consumer = `${consumerOwner}/${consumerRepo}`;
      const resourceOwner = request.owner;
      const rules = rulesForConsumer(consumer);
      let isAllowed = true;

      if (isAllRepos) {
        const ruleResults: RepositoryTokenAuthorizationResourceResultRuleResult[] =
          [];
        const have: InstallationPermissions = {};

        for (const i of rules) {
          const rule = config.rules.repositories[i];
          const patternsForOwner = repoPatternsForOwner(
            resourceOwner,
            repoResourcePatterns[i],
          );
          let isRelevant: boolean;

          if (patternsForOwner.length > 0) {
            if (anyRepoPatternIsAllRepos(patternsForOwner)) {
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
          resourceOwner,
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
        RepositoryTokenAuthorizationResourceResult
      > = {};

      for (const resourceRepo of request.repositories) {
        const resource = `${resourceOwner}/${resourceRepo}`;
        const ruleResults: RepositoryTokenAuthorizationResourceResultRuleResult[] =
          [];
        const have: InstallationPermissions = {};
        let isResourceAllowed = false;

        for (const i of rules) {
          if (!anyPatternMatches(repoResourcePatterns[i], resource)) continue;

          const rule = config.rules.repositories[i];
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
        resourceOwner,
        resources: resourceResults,
        want,
        isAllowed,
      };
    },
  };

  function rulesForConsumer(consumer: string): number[] {
    const indices: number[] = [];

    for (let i = 0; i < config.rules.repositories.length; ++i) {
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
