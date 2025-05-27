import type { ProvisionRequest } from "./provision-request.js";
import type { ProvisionSecretsRule } from "./provision-rule.js";
import type { TokenAuthResult } from "./token-auth-result.js";

export type ProvisionAuthResultExplainer<T> = (
  result: ProvisionAuthResult,
) => T;

export type ProvisionAuthResult = {
  request: ProvisionRequest;
  results: ProvisionAuthTargetResult[];
  isMissingTargets: boolean;
  isAllowed: boolean;
};

export type ProvisionAuthTargetResult = {
  rules: ProvisionAuthTargetRuleResult[];
  have: "allow" | "deny" | undefined;
  tokenAuthResult: TokenAuthResult | undefined;
  isTokenAllowed: boolean;
  isProvisionAllowed: boolean;
  isAllowed: boolean;
};

export type ProvisionAuthTargetRuleResult = {
  index: number;
  rule: ProvisionSecretsRule;
  have: "allow" | "deny" | undefined;
};
