import { anyPatternMatches, createPattern, type Pattern } from "./pattern.js";
import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  authorizeForRepository: (
    consumerOwner: string,
    consumerRepo: string,
    request: TokenRequest,
  ) => [isAllowed: boolean, reason: TokenAuthorizationDenyReason | undefined];
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  const repoResourcePatterns: Record<number, Pattern[]> = {};
  const repoConsumerPatterns: Record<number, Pattern[]> = {};

  for (let n = 1; n <= config.rules.repositories.length; ++n) {
    const resourcePatterns: Pattern[] = [];
    const consumerPatterns: Pattern[] = [];

    for (const resource of config.rules.repositories[n - 1].resources) {
      resourcePatterns.push(createPattern(resource));
    }
    for (const consumer of config.rules.repositories[n - 1].consumers) {
      consumerPatterns.push(createPattern(consumer));
    }

    repoResourcePatterns[n] = resourcePatterns;
    repoConsumerPatterns[n] = consumerPatterns;
  }

  return {
    authorizeForRepository(consumerOwner, consumerRepo, request) {
      const consumer = `${consumerOwner}/${consumerRepo}`;

      for (let n = 1; n <= config.rules.repositories.length; ++n) {
        if (!anyPatternMatches(repoConsumerPatterns[n], consumer)) continue;

        for (const repo of request.repositories) {
          const resource = `${request.owner}/${repo}`;

          if (!anyPatternMatches(repoResourcePatterns[n], resource)) continue;

          return [true, undefined];
        }
      }

      return [false, { type: "NO_MATCHING_REPOSITORY_RULE" }];
    },
  };
}

export type TokenAuthorizationDenyReason = NoMatchingRepositoryRule;

type NoMatchingRepositoryRule = {
  type: "NO_MATCHING_REPOSITORY_RULE";
};
