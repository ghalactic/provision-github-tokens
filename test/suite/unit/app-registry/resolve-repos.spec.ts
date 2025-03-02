import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import { createGitHubPattern } from "../../../../src/github-pattern.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../../github-api.js";

it("resolves a list of repo patterns into a list of repos", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const accountB = createTestInstallationAccount("User", 200, "user-b");
  const repoC = createTestInstallationRepo(accountB, "repo-c");
  const repoD = createTestInstallationRepo(accountB, "repo-d");
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
    appRegistry.resolveRepos(
      ...["org-a/repo-a", "user-b/repo-c"].map(createGitHubPattern),
    ),
  ).toEqual(["org-a/repo-a", "user-b/repo-c"]);
  expect(
    appRegistry.resolveRepos(...["org-*/repo-*"].map(createGitHubPattern)),
  ).toEqual(["org-a/repo-a", "org-a/repo-b"]);
  expect(
    appRegistry.resolveRepos(...["user-*/repo-*"].map(createGitHubPattern)),
  ).toEqual(["user-b/repo-c", "user-b/repo-d"]);
  expect(appRegistry.resolveRepos(...["*/*"].map(createGitHubPattern))).toEqual(
    ["org-a/repo-a", "org-a/repo-b", "user-b/repo-c", "user-b/repo-d"],
  );
  expect(
    appRegistry.resolveRepos(...["xxx/xxx"].map(createGitHubPattern)),
  ).toEqual([]);
});
