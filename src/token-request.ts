import stringify from "fast-json-stable-stringify";
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

export type TokenRequestFactory = (params: TokenRequest) => TokenRequest;

export function createTokenRequestFactory(): TokenRequestFactory {
  const cache: Record<string, TokenRequest> = {};

  return (params: TokenRequest) => {
    const normalized = normalizeTokenRequest(params);
    const key = stringify(normalized);

    return (cache[key] ??= normalized);
  };
}
