import type { PermissionsRule } from "./permissions-rule.js";
import type { PermissionAccess, Permissions } from "./permissions.js";
import type { TokenRequest } from "./token-request.js";

export type TokenAuthResultExplainer<T> = (result: TokenAuthResult) => T;

export type TokenAuthResult =
  | TokenAuthResultAllRepos
  | TokenAuthResultNoRepos
  | TokenAuthResultSelectedRepos;

export type TokenAuthResultAllRepos = TokenAuthResultCommon &
  TokenAuthResourceResult & { type: "ALL_REPOS" };

export type TokenAuthResultNoRepos = TokenAuthResultCommon &
  TokenAuthResourceResult & { type: "NO_REPOS" };

export type TokenAuthResultSelectedRepos = TokenAuthResultCommon & {
  type: "SELECTED_REPOS";
  results: Record<string, TokenAuthResourceResult>;
  isMatched: boolean;
};

export type TokenAuthResourceResult = {
  rules: TokenAuthResourceResultRuleResult[];
  have: Permissions;
  isSufficient: boolean;
};

export type TokenAuthResourceResultRuleResult = {
  index: number;
  rule: PermissionsRule;
  have: Permissions;
  isSufficient: boolean;
};

type TokenAuthResultCommon = {
  request: TokenRequest;
  maxWant: PermissionAccess;
  isSufficient: boolean;
  isMissingRole: boolean;
  isAllowed: boolean;
};
