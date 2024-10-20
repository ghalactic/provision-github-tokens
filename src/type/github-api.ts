import { components } from "@octokit/openapi-types";
import { Endpoints } from "@octokit/types";

export type App = NonNullable<Endpoints["GET /app"]["response"]["data"]>;

export type Installation = NonNullable<
  Endpoints["GET /app/installations/{installation_id}"]["response"]["data"]
>;
export type InstallationAccount = components["schemas"]["simple-user"];
export type InstallationRepo = NonNullable<
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][number]
>;
export type InstallationPermissions = Installation["permissions"] &
  Record<string, PermissionAccess>;
export type InstallationPermissionsWithNone = {
  [K in keyof InstallationPermissions]: "none" | InstallationPermissions[K];
};

export type Repo =
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][0];

export type Permissions = NonNullable<
  Endpoints["POST /app/installations/{installation_id}/access_tokens"]["parameters"]["permissions"]
>;
export type PermissionName = keyof Permissions;
export type PermissionAccess = Required<Permissions>[PermissionName];
export type PermissionAccessWithNone = "none" | PermissionAccess;
