import { expect, it, vi } from "vitest";
import { __getOutput } from "../../../__mocks__/@actions/core.js";
import {
  __setApps,
  __setEnvironments,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createEnvironmentResolver } from "../../../src/environment-resolver.js";
import { createNamePattern } from "../../../src/name-pattern.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
  createTestRepoEnvironment,
} from "../../github-api.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

it("resolves environment names for a repo", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const envA1 = createTestRepoEnvironment("env-a1");
  const envA2 = createTestRepoEnvironment("env-a2");
  const envB1 = createTestRepoEnvironment("env-b1");
  const envB2 = createTestRepoEnvironment("env-b2");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);
  __setEnvironments([[repoA, [envA1, envA2, envB1, envB2]]]);

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const environmentResolver = createEnvironmentResolver(
    octokitFactory,
    appRegistry,
    [
      {
        appId: appA.id,
        privateKey: appA.privateKey,
        issuer: appRegA.issuer,
        provisioner: appRegA.provisioner,
      },
    ],
  );

  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).toEqual(["env-a1", "env-a2", "env-b1", "env-b2"]);
  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("env-a*")],
    ),
  ).toEqual(["env-a1", "env-a2"]);
  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("env-b*")],
    ),
  ).toEqual(["env-b1", "env-b2"]);
  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("env-a*"), createNamePattern("env-b*")],
    ),
  ).toEqual(["env-a1", "env-a2", "env-b1", "env-b2"]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Repo org-a/repo-a has environments ["env-a1","env-a2","env-b1","env-b2"]
    ::debug::Environment patterns ["*"] for org-a/repo-a resolved to ["env-a1","env-a2","env-b1","env-b2"]
    ::debug::Environment patterns ["env-a*"] for org-a/repo-a resolved to ["env-a1","env-a2"]
    ::debug::Environment patterns ["env-b*"] for org-a/repo-a resolved to ["env-b1","env-b2"]
    ::debug::Environment patterns ["env-a*","env-b*"] for org-a/repo-a resolved to ["env-a1","env-a2","env-b1","env-b2"]
    "
  `);
});

it("throws if no provisioner is found", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const environmentResolver = createEnvironmentResolver(
    octokitFactory,
    appRegistry,
    [
      {
        appId: appA.id,
        privateKey: appA.privateKey,
        issuer: appRegA.issuer,
        provisioner: appRegA.provisioner,
      },
    ],
  );

  await expect(
    environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).rejects.toThrow("No provisioners found for repo org-a/repo-a");
});
