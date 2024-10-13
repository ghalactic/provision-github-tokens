import { anyPatternMatches, createPattern, type Pattern } from "./pattern.js";
import { isSufficientPermissions } from "./permissions.js";
import type { InstallationPermissions } from "./type/github-api.js";
import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import type {
  RepositoryTokenAuthorizationResourceResult,
  RepositoryTokenAuthorizationResourceResultRuleResult,
  RepositoryTokenAuthorizationResult,
} from "./type/token-auth-result.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  authorizeForRepository: (
    consumerOwner: string,
    consumerRepo: string,
    request: TokenRequest,
  ) => RepositoryTokenAuthorizationResult;
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  const repoResourcePatterns: Record<number, Pattern[]> = {};
  const repoConsumerPatterns: Record<number, Pattern[]> = {};

  for (let i = 0; i < config.rules.repositories.length; ++i) {
    const resourcePatterns: Pattern[] = [];
    const consumerPatterns: Pattern[] = [];

    for (const resource of config.rules.repositories[i].resources) {
      resourcePatterns.push(createPattern(resource));
    }
    for (const consumer of config.rules.repositories[i].consumers) {
      consumerPatterns.push(createPattern(consumer));
    }

    repoResourcePatterns[i] = resourcePatterns;
    repoConsumerPatterns[i] = consumerPatterns;
  }

  return {
    authorizeForRepository(consumerOwner, consumerRepo, request) {
      const want = request.permissions;

      if (request.repositories.length < 1) {
        throw new Error("No repositories requested");
      }
      if (Object.keys(want).length < 1) {
        throw new Error("No permissions requested");
      }

      const consumer = `${consumerOwner}/${consumerRepo}`;
      const resourceOwner = request.owner;
      const rules = rulesForConsumer(consumer);
      const resourceResults: Record<
        string,
        RepositoryTokenAuthorizationResourceResult
      > = {};
      let isAllowed = true;

      for (const resourceRepo of request.repositories) {
        const resource = `${resourceOwner}/${resourceRepo}`;
        const ruleResults: RepositoryTokenAuthorizationResourceResultRuleResult[] =
          [];
        const have: InstallationPermissions = {};
        let isResourceAllowed = false;

        for (const i of rules) {
          if (!anyPatternMatches(repoResourcePatterns[i], resource)) continue;

          const rule = config.rules.repositories[i];

          for (let [permission, access] of Object.entries(rule.permissions)) {
            if (access === "none") {
              delete have[permission];
            } else {
              have[permission] = access;
            }
          }

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
}
