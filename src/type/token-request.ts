import type { Permissions } from "./api-data.js";

export type TokenRequest = {
  role: string | undefined;
  owner: string;
  repositories: string[] | "all";
  permissions: Permissions;
};
