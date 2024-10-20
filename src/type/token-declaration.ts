import type { InstallationPermissions } from "./github-api.js";

export type TokenDeclaration = {
  shared: boolean;
  as?: string;
  owner?: string;
  repos: string[];
  permissions: InstallationPermissions;
};
