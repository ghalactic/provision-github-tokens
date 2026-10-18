import { isRepoProvisionRequestTarget } from "./provision-request.js";
import type {
  ProvisionAuthAccountTargetResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";

export function isAccountProvisionAuthTargetResult(
  result: ProvisionAuthTargetResult,
): result is ProvisionAuthAccountTargetResult {
  return !isRepoProvisionRequestTarget(result.target);
}
