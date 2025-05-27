import {
  createAccountRef,
  createRepoRef,
  isRepoRef,
  type AccountOrRepoReference,
} from "./github-reference.js";
import {
  normalizeTokenDeclaration,
  type TokenDeclaration,
} from "./token-declaration.js";

export type TokenRequest = {
  consumer: AccountOrRepoReference;
  tokenDec: TokenDeclaration;
  repos: "all" | string[];
};

export function normalizeTokenRequest(request: TokenRequest): TokenRequest {
  const { consumer, tokenDec, repos } = request;

  return {
    consumer: isRepoRef(consumer)
      ? createRepoRef(consumer.account, consumer.repo)
      : createAccountRef(consumer.account),
    repos: repos === "all" ? "all" : repos.toSorted(),
    tokenDec: normalizeTokenDeclaration(tokenDec),
  };
}
