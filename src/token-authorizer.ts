import type { ProviderPermissionsConfig } from "./type/provider-config.js";
import type { TokenRequest } from "./type/token-request.js";

export type TokenAuthorizer = {
  authorizeForRepository: (
    consumerOwner: string,
    consumerRepo: string,
    request: TokenRequest,
  ) => [isAllowed: boolean, reason: string | undefined];
};

export function createTokenAuthorizer(
  config: ProviderPermissionsConfig,
): TokenAuthorizer {
  return {
    authorizeForRepository(consumerOwner, consumerRepo, request) {
      return [true, undefined];
    },
  };
}
