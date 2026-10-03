/* eslint-disable @typescript-eslint/naming-convention */
import openapi from "@octokit/openapi";
import type { components } from "@octokit/openapi-types";
import { createHash } from "node:crypto";
import openapiSampler from "openapi-sampler";
import type {
  App,
  Commit,
  Environment,
  Installation,
  InstallationAccount,
  InstallationRepo,
  InstallationToken,
  Issue,
} from "../src/type/github-api.js";
import type { Permissions } from "../src/type/permissions.js";
import type { Visibility } from "../src/type/visibility.js";

const sampleApp = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths["/app"].get.responses["200"]
    .content["application/json"].schema,
) as App;

const sampleInstallation = (
  openapiSampler.sample(
    openapi.schemas["api.github.com.deref"].paths["/app/installations"].get
      .responses["200"].content["application/json"].schema,
  ) as Installation[]
)[0];

const sampleInstallationToken = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths[
    "/app/installations/{installation_id}/access_tokens"
  ].post.responses["201"].content["application/json"].schema,
) as InstallationToken;

const sampleInstallationRepo = (
  openapiSampler.sample(
    openapi.schemas["api.github.com.deref"].paths["/installation/repositories"]
      .get.responses["200"].content["application/json"].schema,
  ) as { repositories: InstallationRepo[] }
).repositories[0];

const sampleEnvironment = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths[
    "/repos/{owner}/{repo}/environments/{environment_name}"
  ].get.responses["200"].content["application/json"].schema,
) as Environment;

const sampleIssue = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths[
    "/repos/{owner}/{repo}/issues/{issue_number}"
  ].get.responses["200"].content["application/json"].schema,
) as Issue;

const sampleCommit = openapiSampler.sample(
  openapi.schemas["api.github.com.deref"].paths[
    "/repos/{owner}/{repo}/commits/{ref}"
  ].get.responses["200"].content["application/json"].schema,
) as Commit;

export type TestApp = App & {
  privateKey: string;
};

export function createTestApp(
  name: string,
  permissions: Permissions = {},
): TestApp {
  const id = stableId(name);
  const slug = slugify(name);

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
    name: string,
    permissions?: Permissions,
    installations?: [
      account: InstallationAccount,
      repoSelection?: "all" | "selected",
    ][],
  ][]
): [TestApp, Installation[]][] {
  return specs.map(([name, permissions, installations]) => {
    const app = createTestApp(name, permissions);
    const insts = (installations ?? []).map(([account, repoSelection]) =>
      createTestInstallation(
        stableId(account.login, name),
        app,
        account,
        repoSelection ?? "all",
      ),
    );

    return [app, insts];
  });
}

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
    target_id: account.id as number,
    account: { ...sampleInstallation.account, ...account },
  };
}

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

export function createTestInstallationAccounts(
  ...specs: [
    type: "Organization" | "User",
    id: number,
    login: string,
    repos?: (
      | string
      | [name: string]
      | [name: string, environments: string[]]
      | [name: string, environments: string[], visibility: Visibility]
    )[],
  ][]
): [InstallationAccount, InstallationRepo[], Environment[][]][] {
  return specs.map(([type, id, login, repoSpecs = []]) => {
    const account: InstallationAccount = {
      ...(sampleInstallation.account as InstallationAccount),
      type,
      login,
      id,
    };

    const repoSpecsNormalized = repoSpecs.map((spec) =>
      typeof spec === "string"
        ? ([spec, [], "private"] as [string, string[], Visibility])
        : ([spec[0], spec[1] ?? [], spec[2] ?? "private"] as [
            string,
            string[],
            Visibility,
          ]),
    );

    const envsByRepo: Environment[][] = repoSpecsNormalized.map(
      ([, envNames]) =>
        envNames.map((name) => ({ ...sampleEnvironment, name })),
    );

    return [
      account,
      createTestInstallationRepos(
        account,
        ...repoSpecsNormalized.map(
          ([repoName, , visibility]) =>
            [repoName, visibility] as [string, Visibility],
        ),
      ),
      envsByRepo,
    ];
  });
}

export function createTestInstallationRepos(
  account: InstallationAccount,
  ...repos: [name: string, visibility: Visibility][]
): InstallationRepo[] {
  return repos.map(([name, visibility]) => ({
    ...sampleInstallationRepo,
    name,
    full_name: `${account.login}/${name}`,
    owner: { ...sampleInstallationRepo.owner, login: account.login },
    visibility,
  }));
}

export function createTestRepo(
  account: string,
  name: string,
  visibility: string,
): InstallationRepo {
  return {
    ...sampleInstallationRepo,
    name,
    full_name: `${account}/${name}`,
    owner: { ...sampleInstallationRepo.owner, login: account },
    visibility,
  };
}

export function createTestIssue(
  owner: string,
  repo: string,
  number: number,
  state: "open" | "closed",
  title: string,
  body: string | null,
  labels: string[],
): Issue {
  return {
    ...sampleIssue,
    number,
    state,
    title,
    body,
    labels: labels.map((name) => ({ name })),
  };
}

export function createTestCommit(
  sha: string,
  message: string,
  filenames: string[] = [],
): Commit {
  const sampleFile = sampleCommit.files?.[0];

  if (!sampleFile) {
    throw new Error("Invariant violation: sampleCommit has no files");
  }

  return {
    ...sampleCommit,
    sha,
    commit: { ...sampleCommit.commit, message },
    files: filenames.map((filename) => ({
      ...sampleFile,
      filename,
    })),
  };
}

export type Artifact = components["schemas"]["artifact"];

export type WorkflowDispatchData = {
  workflow_run_id: number | bigint;
  run_url: string;
  html_url: string;
};

function stableId(...parts: string[]): number {
  const hash = createHash("sha256").update(parts.join("\0")).digest();

  return hash.readUInt32BE(0);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
