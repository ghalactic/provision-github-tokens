import stringify from "fast-json-stable-stringify";
import type { AppRegistry } from "./app-registry.js";
import { createGitHubPattern } from "./github-pattern.js";
import {
  createAccountRef,
  createRepoRef,
  isRepoRef,
  repoRefFromName,
  repoRefToString,
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

export type TokenRequestFactory = (
  tokenDec: TokenDeclaration,
  consumer: AccountOrRepoReference,
) => TokenRequest;

export function createTokenRequestFactory(
  appRegistry: AppRegistry,
): TokenRequestFactory {
  const cache: Record<string, TokenRequest> = {};

  return (tokenDec, consumer) => {
    let repos: "all" | string[];

    if (tokenDec.repos === "all") {
      repos = "all";
    } else {
      const repoPatterns = tokenDec.repos.map((repo) => {
        return createGitHubPattern(
          repoRefToString(createRepoRef(tokenDec.account, repo)),
        );
      });

      repos = appRegistry
        .resolveIssuerRepos(repoPatterns)
        .map((repo) => repoRefFromName(repo).repo);
    }

    const tokenReq = normalizeTokenRequest({ consumer, tokenDec, repos });

    return (cache[stringify(tokenReq)] ??= tokenReq);
  };
}
