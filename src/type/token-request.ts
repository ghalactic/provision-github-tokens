import type { Permissions } from "./permissions.js";

export type TokenRequest = {
  role: string | undefined;
  account: string;
  repos: "all" | string[];
  permissions: Permissions;
};
