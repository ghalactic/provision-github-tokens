import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

export function isFullyProvisioned(
  authResult: ProvisionAuthResult,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): boolean {
  const targetResults = provisionResults.get(authResult);

  if (!targetResults?.size) return false;

  for (const result of targetResults.values()) {
    if (result.type !== "PROVISIONED") return false;
  }

  return true;
}

export function failureReason(
  authResult: ProvisionAuthResult,
  tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >,
): string {
  if (
    authResult.isMissingTargets ||
    authResult.request.to.length < 1 ||
    authResult.results.length < 1
  ) {
    return "No targets to provision to";
  }

  if (authResult.request.tokenDec == null) {
    return authResult.request.tokenDecIsRegistered
      ? "Token declaration isn't shared"
      : "Token declaration doesn't exist";
  }

  if (!authResult.results.every((t) => t.isTokenAllowed)) {
    return "Token not allowed";
  }

  if (!authResult.isAllowed) return "Secret not allowed";

  // All targets in a secret share the same token declaration, and the consumer
  // doesn't affect issuer selection, so the token creation result is the same
  // for every target — just check the first one.
  const firstTarget = authResult.results[0];

  /* istanbul ignore next - @preserve */
  if (!firstTarget.tokenAuthResult) {
    throw new Error(
      "Invariant violation: Missing token auth result for allowed target",
    );
  }

  const tokenResult = tokenCreationResults.get(firstTarget.tokenAuthResult);

  /* istanbul ignore next - @preserve */
  if (!tokenResult) {
    throw new Error(
      "Invariant violation: Missing token creation result for allowed target",
    );
  }

  if (tokenResult.type === "NO_ISSUER") return "No suitable issuer";

  if (tokenResult.type === "REQUEST_ERROR" || tokenResult.type === "ERROR") {
    return "Failed to issue token";
  }

  const targetResults = provisionResults.get(authResult);

  /* istanbul ignore next - @preserve */
  if (!targetResults) {
    throw new Error(
      "Invariant violation: Missing provision results for auth result",
    );
  }

  let provisionedCount = 0;
  let failedCount = 0;
  let hasNoProvisioner = false;

  for (const result of targetResults.values()) {
    if (result.type === "PROVISIONED") {
      ++provisionedCount;
    } else {
      ++failedCount;
      if (result.type === "NO_PROVISIONER") hasNoProvisioner = true;
    }
  }

  if (hasNoProvisioner && failedCount === targetResults.size) {
    return "No suitable provisioner";
  }

  if (provisionedCount > 0 && failedCount > 0) {
    return "Failed to provision to some targets";
  }

  return "Failed to provision";
}
