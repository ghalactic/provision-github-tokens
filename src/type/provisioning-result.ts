import type { ProvisioningResult } from "../provisioner.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./provision-auth-result.js";

export type ProvisioningResultExplainer<T> = (
  authResult: ProvisionAuthResult,
  targetResults: Map<ProvisionAuthTargetResult, ProvisioningResult>,
) => T;
