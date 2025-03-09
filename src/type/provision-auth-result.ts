import type { ProvisionRequest } from "./provision-request.js";
import type { ProvisionSecretsRule } from "./provision-rule.js";

export type ProvisionAuthResultExplainer<T> = (
  result: ProvisionAuthResult,
) => T;

export type ProvisionAuthResult = {
  request: ProvisionRequest;
  rules: ProvisionAuthRuleResult[];
  have: "allow" | "deny" | undefined;
  isAllowed: boolean;
};

export type ProvisionAuthRuleResult = {
  index: number;
  rule: ProvisionSecretsRule;
  have: "allow" | "deny" | undefined;
};
