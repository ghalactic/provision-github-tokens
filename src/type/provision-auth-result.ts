import type {
  ProvisionRequest,
  ProvisionRequestTarget,
} from "../provision-request.js";
import type { ProvisionSecretsRule } from "./provision-rule.js";
import type { TokenAuthResult } from "./token-auth-result.js";
import type { Visibility } from "./visibility.js";

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
  target: ProvisionRequestTarget;
  rules: ProvisionAuthTargetRuleResult[];
  have: "allow" | "deny" | undefined;
  tokenAuthResult: TokenAuthResult | undefined;
  isTokenAllowed: boolean;
  isProvisionAllowed: boolean;
  isAllowed: boolean;
  selectedRepos?: ProvisionAuthSelectedReposResult;
};

export type ProvisionAuthSelectedReposResult = {
  results: Record<string, ProvisionAuthSelectedRepoResult>;
  isMatched: boolean;
};

export type ProvisionAuthSelectedRepoResult = {
  rules: ProvisionAuthTargetRuleResult[];
  have: "allow" | "deny" | undefined;
  isAllowed: boolean;
  visibility: Visibility;
};

export type ProvisionAuthTargetRuleResult = {
  index: number;
  rule: ProvisionSecretsRule;
  have: "allow" | "deny" | undefined;
};
