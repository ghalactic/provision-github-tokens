import type { Permissions } from "./permissions.js";
import type { Visibility } from "./visibility.js";

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
  selectedRepos?: PermissionsRuleSelectedReposCriteria;
};

export type PermissionsRuleSelectedReposCriteria = {
  repos: string[];
  visibility: Visibility;
};
