import type { InstallationPermissions } from "./github-api.js";

export type PermissionsRules = {
  repositories: RepositoryPermissionRule[];
};

export type RepositoryPermissionRule = {
  description?: string;
  resources: string[];
  consumers: string[];
  permissions: {
    [Property in keyof InstallationPermissions]:
      | InstallationPermissions[Property]
      | "none";
  };
};
