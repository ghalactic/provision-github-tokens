import { isRepoProvisionRequestTarget } from "./provision-request.js";
import type {
  ProvisionAuthRepoTargetResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";

export function isRepoProvisionAuthTargetResult(
  result: ProvisionAuthTargetResult,
): result is ProvisionAuthRepoTargetResult {
  return isRepoProvisionRequestTarget(result.target);
}
