import { RequestError } from "@octokit/request-error";
import type { AppRegistry } from "./app-registry.js";
import type { OctokitFactory } from "./octokit.js";
import type { InstallationToken } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

export type TokenFactory = (
  results: TokenAuthResult[],
) => Promise<Map<TokenAuthResult, TokenCreationResult>>;

export type TokenCreationResult =
  | TokenCreationNoIssuerResult
  | TokenCreationSuccessResult
  | TokenCreationRequestErrorResult
  | TokenCreationErrorResult;

export type TokenCreationNoIssuerResult = {
  type: "NO_ISSUER";
};

export type TokenCreationSuccessResult = {
  type: "SUCCESS";
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
  appRegistry: AppRegistry,
  appsInput: AppInput[],
  octokitFactory: OctokitFactory,
): TokenFactory {
  return async (authResults) => {
    const creationResults = new Map<TokenAuthResult, TokenCreationResult>();

    for (const auth of authResults) {
      const [issuerReg] = appRegistry.findIssuersForRequest(auth.request);

      if (!issuerReg) {
        creationResults.set(auth, { type: "NO_ISSUER" });

        continue;
      }

      const { installation } = issuerReg;
      const octokit = octokitFactory.installationOctokit(
        appsInput,
        installation.app_id,
        installation.id,
      );

      try {
        const { data: token } =
          await octokit.rest.apps.createInstallationAccessToken({
            installation_id: installation.id,
            repositories:
              auth.request.repos === "all" ? undefined : auth.request.repos,
            permissions: auth.request.tokenDec.permissions,
          });

        creationResults.set(auth, { type: "SUCCESS", token });
      } catch (error) {
        if (error instanceof RequestError) {
          creationResults.set(auth, { type: "REQUEST_ERROR", error });
        } else {
          creationResults.set(auth, { type: "ERROR", error });
        }
      }
    }

    return creationResults;
  };
}
