import type { InstallationPermissions } from "./github-api.js";

export type TokenDeclaration = {
  shared: boolean;
  as?: string;
  account?: string;
  repos: "all" | string[];
  permissions: InstallationPermissions;
};
