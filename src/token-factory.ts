import { info } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import type { FindIssuerOctokit } from "./issuer-octokit.js";
import { pluralize } from "./pluralize.js";
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
    const creationResults = new Map<TokenAuthResult, TokenCreationResult>();

    for (const auth of authResults) {
      if (!auth.isAllowed) {
        creationResults.set(auth, { type: "NOT_ALLOWED" });

        continue;
      }

      const found = findIssuerOctokit(auth.request);
      if (!found) {
        creationResults.set(auth, { type: "NO_ISSUER" });

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

        creationResults.set(auth, { type: "CREATED", token });
      } catch (error) {
        if (error instanceof RequestError) {
          creationResults.set(auth, { type: "REQUEST_ERROR", error });
        } else {
          creationResults.set(auth, { type: "ERROR", error });
        }
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
      info(`Created ${pluralize(createdCount, "token", "tokens")}`);
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
