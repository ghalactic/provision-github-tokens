import { components } from "@octokit/openapi-types";
import { Endpoints } from "@octokit/types";

export type Repo =
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][number];

export type Environment =
  Endpoints["GET /repos/{owner}/{repo}/environments/{environment_name}"]["response"]["data"];

export type App = NonNullable<Endpoints["GET /app"]["response"]["data"]>;

export type Installation = NonNullable<
  Endpoints["GET /app/installations/{installation_id}"]["response"]["data"]
>;
export type InstallationAccount = components["schemas"]["simple-user"];
export type InstallationRepo = NonNullable<
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][number]
>;

export type InstallationToken = NonNullable<
  Endpoints["POST /app/installations/{installation_id}/access_tokens"]["response"]["data"]
>;

export type PublicKey = {
  key_id: string;
  key: string;
};
