import type { InstallationPermissions } from "./github-api.js";
import type { PermissionsRule } from "./permissions-rule.js";

export type RepoTokenAuthorizationResultExplainer<T> = (
  result: RepoTokenAuthorizationResult,
) => T;

export type RepoTokenAuthorizationResult =
  | RepoTokenAuthorizationResultAllRepos
  | RepoTokenAuthorizationResultNoRepos
  | RepoTokenAuthorizationResultSelectedRepos;

export type RepoTokenAuthorizationResultAllRepos =
  RepoTokenAuthorizationResultCommon &
    RepoTokenAuthorizationResourceResult & {
      type: "ALL_REPOS";
      account: string;
    };

export type RepoTokenAuthorizationResultNoRepos =
  RepoTokenAuthorizationResultCommon &
    RepoTokenAuthorizationResourceResult & {
      type: "NO_REPOS";
      account: string;
    };

export type RepoTokenAuthorizationResultSelectedRepos =
  RepoTokenAuthorizationResultCommon & {
    type: "SELECTED_REPOS";
    account: string;
    results: Record<string, RepoTokenAuthorizationResourceResult>;
  };

export type RepoTokenAuthorizationResourceResult = {
  rules: RepoTokenAuthorizationResourceResultRuleResult[];
  have: InstallationPermissions;
  isAllowed: boolean;
};

export type RepoTokenAuthorizationResourceResultRuleResult = {
  index: number;
  rule: PermissionsRule;
  have: InstallationPermissions;
  isAllowed: boolean;
};

type RepoTokenAuthorizationResultCommon = {
  account: string;
  consumer: string;
  want: InstallationPermissions;
  isAllowed: boolean;
};
