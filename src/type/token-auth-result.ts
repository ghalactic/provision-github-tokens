import type { TokenRequest } from "../token-request.js";
import type { PermissionsRule } from "./permissions-rule.js";
import type { PermissionAccess, Permissions } from "./permissions.js";
import type { Visibility } from "./visibility.js";

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
  results: Record<string, TokenAuthResourceResultWithVisibility>;
  isMatched: boolean;
};

export type TokenAuthResourceResult = {
  rules: TokenAuthResourceResultRuleResult[];
  have: Permissions;
  isSufficient: boolean;
};

export type TokenAuthResourceResultWithVisibility = TokenAuthResourceResult & {
  visibility: Visibility;
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
