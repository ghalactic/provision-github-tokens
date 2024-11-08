import type { Permissions } from "./github-api.js";

export type TokenRequest = {
  role: string | undefined;
  owner: string;
  repos: "all" | string[];
  permissions: Permissions;
};
