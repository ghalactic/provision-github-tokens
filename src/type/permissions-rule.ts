import type { InstallationPermissions } from "./github-api.js";

export type PermissionsRule = {
  description?: string;
  resources: PermissionsRuleResourceCriteria[];
  consumers: string[];
  permissions: {
    [Property in keyof InstallationPermissions]:
      | InstallationPermissions[Property]
      | "none";
  };
};

export type PermissionsRuleResourceCriteria = {
  accounts: string[];
  noRepos: boolean;
  allRepos: boolean;
  selectedRepos: string[];
};
