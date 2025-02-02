import type {
  InstallationPermissions,
  PermissionAccess,
} from "./github-api.js";
import type { PermissionsRule } from "./permissions-rule.js";

export type TokenAuthResultExplainer<T> = (result: TokenAuthResult) => T;

export type TokenAuthResult =
  | TokenAuthResultAllRepos
  | TokenAuthResultNoRepos
  | TokenAuthResultSelectedRepos;

export type TokenAuthResultAllRepos = TokenAuthResultCommon &
  TokenAuthResourceResult & {
    type: "ALL_REPOS";
    account: string;
  };

export type TokenAuthResultNoRepos = TokenAuthResultCommon &
  TokenAuthResourceResult & {
    type: "NO_REPOS";
    account: string;
  };

export type TokenAuthResultSelectedRepos = TokenAuthResultCommon & {
  type: "SELECTED_REPOS";
  account: string;
  results: Record<string, TokenAuthResourceResult>;
};

export type TokenAuthResourceResult = {
  rules: TokenAuthResourceResultRuleResult[];
  have: InstallationPermissions;
  isSufficient: boolean;
};

export type TokenAuthResourceResultRuleResult = {
  index: number;
  rule: PermissionsRule;
  have: InstallationPermissions;
  isSufficient: boolean;
};

export type TokenAuthConsumer =
  | TokenAuthConsumerAccount
  | TokenAuthConsumerRepo;

export type TokenAuthConsumerAccount = {
  type: "ACCOUNT";
  name: string;
};

export type TokenAuthConsumerRepo = {
  type: "REPO";
  name: string;
};

type TokenAuthResultCommon = {
  role: string | undefined;
  account: string;
  consumer: TokenAuthConsumer;
  want: InstallationPermissions;
  maxWant: PermissionAccess;
  isSufficient: boolean;
  isMissingRole: boolean;
  isAllowed: boolean;
};
