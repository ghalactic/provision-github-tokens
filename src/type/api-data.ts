import { Endpoints } from "@octokit/types";

export type App = Pick<
  NonNullable<Endpoints["GET /app"]["response"]["data"]>,
  "id" | "slug" | "name"
>;

export type Installation = Pick<
  NonNullable<
    Endpoints["GET /app/installations/{installation_id}"]["response"]["data"]
  >,
  "id" | "app_id" | "app_slug" | "repository_selection" | "permissions"
>;

export type Repository = {
  owner: Pick<GetInstallationRepositoriesRepository["owner"], "login">;
  name: GetInstallationRepositoriesRepository["name"];
  full_name: GetInstallationRepositoriesRepository["full_name"];
};

export type Permissions = NonNullable<
  Endpoints["POST /app/installations/{installation_id}/access_tokens"]["parameters"]["permissions"]
>;
export type PermissionName = keyof Permissions;
export type PermissionAccess = Required<Permissions>[PermissionName];

type GetInstallationRepositoriesRepository = NonNullable<
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][0]
>;
