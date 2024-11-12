import type { InstallationPermissions } from "./github-api.js";

export type PermissionsRule = {
  description?: string;
  resources: string[];
  consumers: string[];
  permissions: {
    [Property in keyof InstallationPermissions]:
      | InstallationPermissions[Property]
      | "none";
  };
};
