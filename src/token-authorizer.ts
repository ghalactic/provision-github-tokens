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
  const repoConsumerPatterns: Record<number, Pattern[]> = {};

  for (let n = 1; n <= config.rules.repositories.length; ++n) {
    const consumerPatterns: Pattern[] = [];

    for (const consumer of config.rules.repositories[n - 1].consumers) {
      consumerPatterns.push(createPattern(consumer));
    }

    repoConsumerPatterns[n] = consumerPatterns;
  }

  return {
    authorizeForRepository(consumerOwner, consumerRepo, request) {
      const consumer = `${consumerOwner}/${consumerRepo}`;

      for (let n = 1; n <= config.rules.repositories.length; ++n) {
        if (anyPatternMatches(repoConsumerPatterns[n], consumer)) {
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
