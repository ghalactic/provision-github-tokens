import type { Permissions } from "./api-data.js";

export type TokenRequest = {
  owner: string;
  repositories: string[] | "all";
  permissions: Permissions;
  app?: number | string;
};
