import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";

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
