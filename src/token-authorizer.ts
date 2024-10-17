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
      const resourceOwner = request.owner;
      const matchByResource: Record<string, boolean> = {};

      for (const resourceRepo of request.repositories) {
        matchByResource[`${resourceOwner}/${resourceRepo}`] = false;
      }

      for (const n of rulesForConsumer(consumer)) {
        for (const resourceRepo of request.repositories) {
          const resource = `${resourceOwner}/${resourceRepo}`;

          if (anyPatternMatches(repoResourcePatterns[n], resource)) {
            matchByResource[resource] = true;
          }
        }
      }

      const unmatchedResources: string[] = [];

      for (const [resource, isMatched] of Object.entries(matchByResource)) {
        if (!isMatched) unmatchedResources.push(resource);
      }

      if (unmatchedResources.length < 1) return [true, undefined];

      return [
        false,
        {
          type: "NO_MATCHING_REPOSITORY_RULE",
          resources: unmatchedResources,
          consumer,
        },
      ];
    },
  };

  function rulesForConsumer(consumer: string): number[] {
    const numbers: number[] = [];

    for (let n = 1; n <= config.rules.repositories.length; ++n) {
      if (anyPatternMatches(repoConsumerPatterns[n], consumer)) numbers.push(n);
    }

    return numbers;
  }
}

export type TokenAuthorizationDenyReason = NoMatchingRepositoryRule;

type NoMatchingRepositoryRule = {
  type: "NO_MATCHING_REPOSITORY_RULE";
};
