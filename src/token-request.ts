import type { AccountOrRepoReference } from "./github-reference.js";
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
  const { repos } = request;

  return {
    ...request,
    repos: repos === "all" ? "all" : repos.toSorted(),
    tokenDec: normalizeTokenDeclaration(request.tokenDec),
  };
}
