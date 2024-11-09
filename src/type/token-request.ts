import type { Permissions } from "./github-api.js";

export type TokenRequest = {
  role: string | undefined;
  account: string;
  repos: "all" | string[];
  permissions: Permissions;
};
