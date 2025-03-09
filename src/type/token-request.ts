import type { AccountOrRepoReference } from "../github-reference.js";
import type { Permissions } from "./permissions.js";

export type TokenRequest = {
  consumer: AccountOrRepoReference;
  role: string | undefined;
  account: string;
  repos: "all" | string[];
  permissions: Permissions;
};
