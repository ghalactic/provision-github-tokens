import type { PermissionsWithNone } from "./github-api.js";

export type PermissionsRule = {
  description?: string;
  resources: PermissionsRuleResourceCriteria[];
  consumers: string[];
  permissions: PermissionsWithNone;
};

export type PermissionsRuleResourceCriteria = {
  accounts: string[];
  noRepos: boolean;
  allRepos: boolean;
  selectedRepos: string[];
};
