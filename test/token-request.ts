import stringify from "fast-json-stable-stringify";
import { createGitHubPattern } from "../src/github-pattern.js";
import { createRepoRef, repoRefToString } from "../src/github-reference.js";
import { anyPatternMatches } from "../src/pattern.js";
import {
  normalizeTokenRequest,
  type TokenRequest,
  type TokenRequestFactory,
} from "../src/token-request.js";

export function createTestTokenRequestFactory(): TokenRequestFactory {
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

      repos = ["repo-a", "repo-b", "repo-c"]
        .filter((repo) => anyPatternMatches(repoPatterns, repo))
        .sort();
    }

    const tokenReq = normalizeTokenRequest({ consumer, tokenDec, repos });

    return (cache[stringify(tokenReq)] ??= tokenReq);
  };
}
