import type { Permissions } from "./permissions.js";

export type TokenDeclaration = {
  shared: boolean;
  as?: string;
  account?: string;
  repos: "all" | string[];
  permissions: Permissions;
};
