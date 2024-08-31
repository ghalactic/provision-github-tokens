import openapi from "@octokit/openapi";
import { Endpoints } from "@octokit/types";
import { createHash } from "crypto";
import openapiSampler from "openapi-sampler";

// App

type PartialApp = NonNullable<Endpoints["GET /app"]["response"]["data"]>;
type App = PartialApp & {
  slug: NonNullable<PartialApp["slug"]>;
  permissions: Installation["permissions"];
};
type TestApp = App & {
  privateKey: string;
};

export const sampleApp = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths["/app"].get.responses["200"]
    .content["application/json"].schema,
) as App;

export function createTestApp(
  id: number,
  slug: string,
  name: string,
  permissions: Installation["permissions"] = {},
): TestApp {
  return {
    ...sampleApp,
    id,
    slug,
    name,
    permissions,
    privateKey: createHash("sha256").update(String(id)).digest("base64"),
  };
}

// Installation

type PartialInstallation = NonNullable<
  Endpoints["GET /app/installations"]["response"]["data"][number]
>;
type Installation = PartialInstallation & {
  account: NonNullable<PartialInstallation["account"]>;
};
type TestInstallation = Installation & {
  repositories: InstallationRepo[];
};

export const sampleInstallation = (
  openapiSampler.sample(
    openapi.schemas["api.github.com.deref"].paths["/app/installations"].get
      .responses["200"].content["application/json"].schema,
  ) as Installation[]
)[0];

export function createTestInstallation(
  id: number,
  app: App,
  account: InstallationAccount,
  repoSelection: "all" | "selected",
  repositories: InstallationRepo[],
): TestInstallation {
  return {
    ...sampleInstallation,
    id,
    app_id: app.id,
    app_slug: app.slug,
    repository_selection: repoSelection,
    permissions: app.permissions,
    suspended_by: null,
    suspended_at: null,
    target_type: account.type,
    target_id: account.id,
    account: { ...sampleInstallation.account, ...account },
    repositories,
  };
}

// Installation account

type InstallationAccount = NonNullable<Installation["account"]>;

export function createTestInstallationAccount(
  type: "Organization" | "User",
  id: number,
  login: string,
): InstallationAccount {
  return { ...sampleInstallation.account, type, login, id };
}

// Installation repo

type InstallationRepo = NonNullable<
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"][number]
>;

export const sampleInstallationRepo = (
  openapiSampler.sample(
    openapi.schemas["api.github.com.deref"].paths["/installation/repositories"]
      .get.responses["200"].content["application/json"].schema,
  ) as { repositories: InstallationRepo[] }
).repositories[0];

export function createTestInstallationRepo(
  account: InstallationAccount,
  name: string,
): InstallationRepo {
  return {
    ...sampleInstallationRepo,
    name,
    full_name: `${account.login}/${name}`,
    owner: { ...sampleInstallationRepo.owner, login: account.login },
  };
}
