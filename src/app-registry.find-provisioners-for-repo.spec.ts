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

it("finds provisioners for repos", () => {
  const [[orgA, [repoA, repoB, repoC]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b", "repo-c"],
  ]);
  const appA: AppRegistration = {
    app: createTestApp("App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };
  const appB: AppRegistration = {
    app: createTestApp("App B"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "selected"),
    repos: [repoB],
  };
  const appC: AppRegistration = {
    app: createTestApp("App C"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appCInstallationA: InstallationRegistration = {
    installation: createTestInstallation(131, appC.app, orgA, "selected"),
    repos: [repoB, repoC],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationA);
  appRegistry.registerApp(appC);
  appRegistry.registerInstallation(appCInstallationA);

  expect(
    appRegistry.findProvisionersForRepo({ account: "org-a", repo: "repo-a" }),
  ).toEqual([appAInstallationA]);
  expect(
    appRegistry.findProvisionersForRepo({ account: "org-a", repo: "repo-b" }),
  ).toEqual([appBInstallationA, appCInstallationA]);
});

it("doesn't find provisioners from non-provisioner apps", () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const appA: AppRegistration = {
    app: createTestApp("App A"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [repoA],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findProvisionersForRepo({ account: "org-a", repo: "repo-a" }),
  ).toHaveLength(0);
});
