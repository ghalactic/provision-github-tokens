import type { InstallationPermissions } from "./github-api.js";
import type { RepoPermissionRule } from "./permission-rule.js";

export type RepoTokenAuthorizationResultExplainer<T> = (
  result: RepoTokenAuthorizationResult,
) => T;

export type RepoTokenAuthorizationResult = {
  consumer: string;
  resourceAccount: string;
  resources: Record<string, RepoTokenAuthorizationResourceResult>;
  want: InstallationPermissions;
  isAllowed: boolean;
};

export type RepoTokenAuthorizationResourceResult = {
  rules: RepoTokenAuthorizationResourceResultRuleResult[];
  have: InstallationPermissions;
  isAllowed: boolean;
};

export type RepoTokenAuthorizationResourceResultRuleResult = {
  index: number;
  rule: RepoPermissionRule;
  have: InstallationPermissions;
  isAllowed: boolean;
};
