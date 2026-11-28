import { debug, info, warning } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import type { FindIssuerOctokit, IssuerCandidate } from "./issuer-octokit.js";
import { createTextTokenCreationExplainer } from "./token-creation-explainer/text.js";
import { tokenShapeKey } from "./token-request.js";
import { tryEach, type TryEachFailedAttempt } from "./try-each.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type {
  TokenCreationAttempt,
  TokenCreationResult,
} from "./type/token-creation-result.js";

export type TokenFactory = (
  authResults: TokenAuthResult[],
) => Promise<Map<TokenAuthResult, TokenCreationResult>>;

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

      const key = tokenShapeKey(auth.request);
      const cached = cache[key];

      if (cached) {
        creationResults.set(auth, cached);

        continue;
      }

      const result: TokenCreationResult = await (async () => {
        const candidates = findIssuerOctokit(auth.request);

        if (candidates.length < 1) return { type: "NO_ISSUER" };

        const result = await tryEach(
          async (candidate) => {
            const { installation } = candidate.issuer;
            debug(
              `Trying issuer app ${installation.app_id} ` +
                `installation ${installation.id}`,
            );

            const { data: token } =
              await candidate.octokit.rest.apps.createInstallationAccessToken({
                installation_id: installation.id,
                repositories:
                  auth.request.repos === "all" ? undefined : auth.request.repos,
                permissions: auth.request.tokenDec.permissions,
              });

            return token;
          },
          () => true,
          candidates,
        );

        const attempts = toTokenCreationAttempts(result.failures);

        if (result.type === "FAILED") return { type: "FAILED", attempts };

        return {
          type: "CREATED",
          token: result.value,
          issuer: result.candidate.issuer,
          failedAttempts: attempts,
        };
      })();

      creationResults.set(auth, (cache[key] = result));
    }

    const explain = createTextTokenCreationExplainer();

    if (creationResults.size > 0) {
      let i = 0;
      for (const [authResult, creationResult] of creationResults) {
        ++i;
        info(`\nToken #${i}:\n`);
        info(explain(authResult, creationResult));
      }
    } else {
      info("");
      warning("⚠️ No tokens were created");
    }

    info("");

    return creationResults;
  };
}

function toTokenCreationAttempts(
  failures: readonly TryEachFailedAttempt<IssuerCandidate>[],
): TokenCreationAttempt[] {
  const attempts: TokenCreationAttempt[] = [];

  for (const { candidate, error } of failures) {
    attempts.push(
      error instanceof RequestError
        ? { type: "REQUEST_ERROR", issuer: candidate.issuer, error }
        : { type: "ERROR", issuer: candidate.issuer, error },
    );
  }

  return attempts;
}
