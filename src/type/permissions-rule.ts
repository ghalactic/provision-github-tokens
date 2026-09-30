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

export type PartialPermissionsRule = {
  description?: string;
  resources: PartialPermissionsRuleResourceCriteria[];
  consumers: string[];
  permissions: Permissions;
};

export type PartialPermissionsRuleResourceCriteria = {
  accounts: string[];
  noRepos: boolean;
  allRepos: boolean;
  selectedRepos?: PartialSelectedReposCriteria;
};

export type PartialSelectedReposCriteria = {
  repos: string[];
};
