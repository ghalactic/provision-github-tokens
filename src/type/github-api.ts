import { components } from "@octokit/openapi-types";
import { Endpoints } from "@octokit/types";

export type Repo =
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][0];

export type App = NonNullable<Endpoints["GET /app"]["response"]["data"]>;

export type Installation = NonNullable<
  Endpoints["GET /app/installations/{installation_id}"]["response"]["data"]
>;
export type InstallationAccount = components["schemas"]["simple-user"];
export type InstallationRepo = NonNullable<
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][number]
>;

export type Permissions = NonNullable<
  Endpoints["POST /app/installations/{installation_id}/access_tokens"]["parameters"]["permissions"]
>;
export type PermissionsWithNone = {
  [K in keyof Permissions]: "none" | Permissions[K];
};
export type PermissionName = keyof Permissions;
export type PermissionAccess = Required<Permissions>[PermissionName];
export type PermissionAccessWithNone = "none" | PermissionAccess;
