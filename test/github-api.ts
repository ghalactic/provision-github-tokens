import openapi from "@octokit/openapi";
import { createHash } from "node:crypto";
import openapiSampler from "openapi-sampler";
import type {
  App,
  Environment,
  Installation,
  InstallationAccount,
  InstallationRepo,
  InstallationToken,
} from "../src/type/github-api.js";
import type { Permissions } from "../src/type/permissions.js";

// App

const sampleApp = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths["/app"].get.responses["200"]
    .content["application/json"].schema,
) as App;

export type TestApp = App & {
  privateKey: string;
};

export function createTestApp(
  id: number,
  slug: string,
  name: string,
  permissions: Permissions = {},
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

export function createTestApps(
  ...specs: [
    id: number,
    slug: string,
    name: string,
    permissions?: Permissions,
    installations?: [
      id: number,
      account: InstallationAccount,
      repoSelection?: "all" | "selected",
    ][],
  ][]
): [TestApp, Installation[]][] {
  return specs.map(([id, slug, name, permissions, installations]) => {
    const app = createTestApp(id, slug, name, permissions);
    const insts = (installations ?? []).map(
      ([instId, account, repoSelection]) =>
        createTestInstallation(instId, app, account, repoSelection ?? "all"),
    );

    return [app, insts];
  });
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

export function createTestInstallationAccounts(
  ...specs: [
    type: "Organization" | "User",
    id: number,
    login: string,
    repos?: string[],
  ][]
): [InstallationAccount, InstallationRepo[]][] {
  return specs.map(([type, id, login, repoNames]) => {
    const account: InstallationAccount = {
      ...(sampleInstallation.account as InstallationAccount),
      type,
      login,
      id,
    };

    return [
      account,
      createTestInstallationRepos(account, ...(repoNames ?? [])),
    ];
  });
}

// Installation repo

const sampleInstallationRepo = (
  openapiSampler.sample(
    openapi.schemas["api.github.com.deref"].paths["/installation/repositories"]
      .get.responses["200"].content["application/json"].schema,
  ) as { repositories: InstallationRepo[] }
).repositories[0];

export function createTestInstallationRepos(
  account: InstallationAccount,
  ...names: string[]
): InstallationRepo[] {
  return names.map((name) => ({
    ...sampleInstallationRepo,
    name,
    full_name: `${account.login}/${name}`,
    owner: { ...sampleInstallationRepo.owner, login: account.login },
  }));
}

// Installation token

const sampleInstallationToken = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths[
    "/app/installations/{installation_id}/access_tokens"
  ].post.responses["201"].content["application/json"].schema,
) as InstallationToken;

export function createTestInstallationToken(
  key: string,
  repos: "all" | string[],
  permissions: Permissions,
): InstallationToken {
  return {
    ...sampleInstallationToken,
    token: `ghs_test_${createHash("sha256").update(key).digest("base64").slice(0, 30)}`,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    permissions: permissions,
    repository_selection: repos === "all" ? "all" : "selected",
  };
}

// Repo environment

const sampleEnvironment = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths[
    "/repos/{owner}/{repo}/environments/{environment_name}"
  ].get.responses["200"].content["application/json"].schema,
) as Environment;

export function createTestRepoEnvironment(name: string): Environment {
  return {
    ...sampleEnvironment,
    name,
  };
}
