import { info, warning } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import stringify from "fast-json-stable-stringify";
import type { FindIssuerOctokit } from "./issuer-octokit.js";
import { createTextTokenCreationExplainer } from "./token-creation-explainer/text.js";
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
    const cache: Record<string, TokenCreationResult> = {};
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

      const result: TokenCreationResult = await (async () => {
        const found = findIssuerOctokit(auth.request);

        if (!found) return { type: "NO_ISSUER" };

        const [octokit, issuerReg] = found;

        try {
          const { data: token } =
            await octokit.rest.apps.createInstallationAccessToken({
              installation_id: issuerReg.installation.id,
              repositories:
                auth.request.repos === "all" ? undefined : auth.request.repos,
              permissions: auth.request.tokenDec.permissions,
            });

          return { type: "CREATED", token };
        } catch (error) {
          return error instanceof RequestError
            ? { type: "REQUEST_ERROR", error }
            : { type: "ERROR", error };
        }
      })();

      creationResults.set(auth, (cache[key] = result));
    }

    const explain = createTextTokenCreationExplainer(creationResults);

    if (creationResults.size > 0) {
      let i = 0;
      for (const [authResult, creationResult] of creationResults) {
        ++i;
        info(`\nToken #${i}:\n`);
        info(explain(authResult, creationResult));
      }
    } else {
      info("");
      warning("❌ No tokens were created");
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
