import type { InstallationPermissions } from "./github-api.js";
import type { RepositoryPermissionRule } from "./permission-rule.js";

export type RepositoryTokenAuthorizationResultExplainer<T> = (
  result: RepositoryTokenAuthorizationResult,
) => T;

export type RepositoryTokenAuthorizationResult = {
  consumer: string;
  resourceOwner: string;
  resources: Record<string, RepositoryTokenAuthorizationResourceResult>;
  want: InstallationPermissions;
  isAllowed: boolean;
};

export type RepositoryTokenAuthorizationResourceResult = {
  rules: RepositoryTokenAuthorizationResourceResultRuleResult[];
  have: InstallationPermissions;
  isAllowed: boolean;
};

export type RepositoryTokenAuthorizationResourceResultRuleResult = {
  index: number;
  rule: RepositoryPermissionRule;
  have: InstallationPermissions;
  isAllowed: boolean;
};
