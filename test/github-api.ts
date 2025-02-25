import openapi from "@octokit/openapi";
import { createHash } from "crypto";
import openapiSampler from "openapi-sampler";
import type {
  App,
  Installation,
  InstallationAccount,
  InstallationRepo,
  Permissions,
} from "../src/type/github-api.js";

// App

const sampleApp = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths["/app"].get.responses["200"]
    .content["application/json"].schema,
) as App;

export function createTestApp(
  id: number,
  slug: string,
  name: string,
  permissions: Permissions = {},
): App & {
  privateKey: string;
} {
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

const sampleInstallation = (
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
): Installation {
  return {
    ...sampleInstallation,
    id,
    app_id: app.id,
    app_slug: app.slug ?? "",
    repository_selection: repoSelection,
    permissions: app.permissions as Permissions,
    suspended_by: null,
    suspended_at: null,
    target_type: account.type,
    target_id: account.id,
    account: { ...sampleInstallation.account, ...account },
  };
}

// Installation account

export function createTestInstallationAccount(
  type: "Organization" | "User",
  id: number,
  login: string,
): InstallationAccount {
  return {
    ...(sampleInstallation.account as InstallationAccount),
    type,
    login,
    id,
  };
}

// Installation repo

const sampleInstallationRepo = (
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
