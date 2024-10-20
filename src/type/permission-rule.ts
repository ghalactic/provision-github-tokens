import type { InstallationPermissions } from "./github-api.js";

export type PermissionsRules = {
  repos: RepoPermissionRule[];
};

export type RepoPermissionRule = {
  description?: string;
  resources: string[];
  consumers: string[];
  permissions: {
    [Property in keyof InstallationPermissions]:
      | InstallationPermissions[Property]
      | "none";
  };
};
