import { info } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import stringify from "fast-json-stable-stringify";
import type { FindIssuerOctokit } from "./issuer-octokit.js";
import { pluralize } from "./pluralize.js";
import type { TokenRequest } from "./token-request.js";
import type { InstallationToken } from "./type/github-api.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

export type TokenFactory = (
  authResults: TokenAuthResult[],
) => Promise<Map<TokenAuthResult, TokenCreationResult>>;

export type TokenCreationResult =
  | TokenCreationNotAllowedResult
  | TokenCreationNoIssuerResult
  | TokenCreationCreatedResult
  | TokenCreationRequestErrorResult
  | TokenCreationErrorResult;

export type TokenCreationNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type TokenCreationNoIssuerResult = {
  type: "NO_ISSUER";
};

export type TokenCreationCreatedResult = {
  type: "CREATED";
  token: InstallationToken;
};

export type TokenCreationRequestErrorResult = {
  type: "REQUEST_ERROR";
  error: RequestError;
};

export type TokenCreationErrorResult = {
  type: "ERROR";
  error: unknown;
};

export function createTokenFactory(
  findIssuerOctokit: FindIssuerOctokit,
): TokenFactory {
  return async (authResults) => {
    const cache: Partial<Record<string, TokenCreationResult>> = {};
    const creationResults = new Map<TokenAuthResult, TokenCreationResult>();

    for (const auth of authResults) {
      if (!auth.isAllowed) {
        creationResults.set(auth, { type: "NOT_ALLOWED" });

        continue;
      }

      const key = tokenCreationCacheKey(auth.request);
      const cached = cache[key];

      if (cached) {
        creationResults.set(auth, cached);

        continue;
      }

      const found = findIssuerOctokit(auth.request);

      if (!found) {
        const result: TokenCreationResult = { type: "NO_ISSUER" };
        cache[key] = result;
        creationResults.set(auth, result);

        continue;
      }

      const [octokit, issuerReg] = found;

      try {
        const { data: token } =
          await octokit.rest.apps.createInstallationAccessToken({
            installation_id: issuerReg.installation.id,
            repositories:
              auth.request.repos === "all" ? undefined : auth.request.repos,
            permissions: auth.request.tokenDec.permissions,
          });

        const result: TokenCreationResult = { type: "CREATED", token };
        cache[key] = result;
        creationResults.set(auth, result);
      } catch (error) {
        const result: TokenCreationResult =
          error instanceof RequestError
            ? { type: "REQUEST_ERROR", error }
            : { type: "ERROR", error };
        cache[key] = result;
        creationResults.set(auth, result);
      }
    }

    let createdCount = 0;
    let notCreatedCount = 0;

    for (const result of creationResults.values()) {
      if (result.type === "CREATED") {
        ++createdCount;
      } else {
        ++notCreatedCount;
      }
    }

    if (createdCount > 0) {
      let uniqueCreatedCount = 0;

      for (const key in cache) {
        if (cache[key]?.type === "CREATED") {
          ++uniqueCreatedCount;
        }
      }

      if (uniqueCreatedCount < createdCount) {
        const uniqueTokens = pluralize(
          uniqueCreatedCount,
          "unique token",
          "unique tokens",
        );
        const tokenRequests = pluralize(
          createdCount,
          "token request",
          "token requests",
        );
        info(`Created ${uniqueTokens} for ${tokenRequests}`);
      } else {
        info(`Created ${pluralize(createdCount, "token", "tokens")}`);
      }
    }

    if (notCreatedCount > 0) {
      const pluralized = pluralize(
        notCreatedCount,
        "requested token wasn't",
        "requested tokens weren't",
      );
      info(`${pluralized} created`);
    }

    return creationResults;
  };
}

function tokenCreationCacheKey(request: TokenRequest): string {
  return stringify({
    account: request.tokenDec.account,
    as: request.tokenDec.as,
    permissions: request.tokenDec.permissions,
    repos: request.repos,
  });
}
