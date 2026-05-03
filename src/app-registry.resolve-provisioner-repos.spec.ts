import { expect, it } from "vitest";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "./app-registry.js";
import { createGitHubPattern } from "./github-pattern.js";

it("resolves a list of repo patterns into a list of provisioner-accessible repos", () => {
  const [[accountA, [repoA, repoB]], [accountB, [repoC, repoD]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "org-a", ["repo-a", "repo-b"]],
      ["User", 200, "user-b", ["repo-c", "repo-d"]],
    );
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, accountA, "selected"),
    repos: [repoA, repoB],
  };
  const appAInstallationRegB: InstallationRegistration = {
    installation: createTestInstallation(112, appA.app, accountB, "selected"),
    repos: [repoC, repoD],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerInstallation(appAInstallationRegB);

  expect(
    appRegistry.resolveProvisionerRepos(
      ["org-a/repo-a", "user-b/repo-c"].map(createGitHubPattern),
    ),
  ).toEqual(["org-a/repo-a", "user-b/repo-c"]);
  expect(
    appRegistry.resolveProvisionerRepos(
      ["org-*/repo-*"].map(createGitHubPattern),
    ),
  ).toEqual(["org-a/repo-a", "org-a/repo-b"]);
  expect(
    appRegistry.resolveProvisionerRepos(
      ["user-*/repo-*"].map(createGitHubPattern),
    ),
  ).toEqual(["user-b/repo-c", "user-b/repo-d"]);
  expect(
    appRegistry.resolveProvisionerRepos(["*/*"].map(createGitHubPattern)),
  ).toEqual(["org-a/repo-a", "org-a/repo-b", "user-b/repo-c", "user-b/repo-d"]);
  expect(
    appRegistry.resolveProvisionerRepos(["xxx/xxx"].map(createGitHubPattern)),
  ).toEqual([]);
});

it("doesn't resolve repos accessible only to non-provisioner apps", () => {
  const [[accountA, [repoA]], [accountB, [repoB]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "org-a", ["repo-a"]],
      ["Organization", 200, "org-b", ["repo-b"]],
    );
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, accountA, "selected"),
    repos: [repoA],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, accountB, "selected"),
    repos: [repoB],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationRegA);

  expect(
    appRegistry.resolveProvisionerRepos([createGitHubPattern("*/*")]),
  ).toEqual(["org-b/repo-b"]);
});
