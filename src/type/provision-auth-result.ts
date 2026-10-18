import type {
  GitHubAccountProvisionRequestTarget,
  GitHubEnvironmentProvisionRequestTarget,
  GitHubRepoProvisionRequestTarget,
  ProvisionRequest,
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

export type ProvisionAuthTargetResult =
  | ProvisionAuthAccountTargetResult
  | ProvisionAuthEnvironmentTargetResult
  | ProvisionAuthRepoTargetResult;

export type ProvisionAuthRepoOrEnvironmentTargetResult =
  ProvisionAuthEnvironmentTargetResult | ProvisionAuthRepoTargetResult;

export type ProvisionAuthAccountTargetResult =
  ProvisionAuthTargetResultCommon & {
    target: GitHubAccountProvisionRequestTarget;
    selectedRepos?: ProvisionAuthSelectedReposResult;
  };

export type ProvisionAuthEnvironmentTargetResult =
  ProvisionAuthTargetResultCommon & {
    target: GitHubEnvironmentProvisionRequestTarget;
  };

export type ProvisionAuthRepoTargetResult = ProvisionAuthTargetResultCommon & {
  target: GitHubRepoProvisionRequestTarget;
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

type ProvisionAuthTargetResultCommon = {
  rules: ProvisionAuthTargetRuleResult[];
  have: "allow" | "deny" | undefined;
  tokenAuthResult: TokenAuthResult | undefined;
  isTokenAllowed: boolean;
  isProvisionAllowed: boolean;
  isAllowed: boolean;
};
