import type { Permissions } from "./permissions.js";

export type PermissionsRule = {
  description?: string;
  resources: PermissionsRuleResourceCriteria[];
  consumers: string[];
  permissions: Permissions;
};

export type PermissionsRuleResourceCriteria = {
  accounts: string[];
  noRepos: boolean;
  allRepos: boolean;
  selectedRepos: string[];
};
