import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import { createNamePattern } from "../../../../src/name-pattern.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
} from "../../../github-api.js";

it("resolves a list of account patterns into a list of issuer-accessible accounts", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const accountB = createTestInstallationAccount("User", 200, "user-b");
  const accountC = createTestInstallationAccount("Organization", 300, "org-c");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, accountA, "selected"),
    repos: [],
  };
  const appAInstallationRegB: InstallationRegistration = {
    installation: createTestInstallation(112, appA.app, accountB, "selected"),
    repos: [],
  };
  const appAInstallationRegC: InstallationRegistration = {
    installation: createTestInstallation(113, appA.app, accountC, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerInstallation(appAInstallationRegB);
  appRegistry.registerInstallation(appAInstallationRegC);

  expect(
    appRegistry.resolveIssuerAccounts(
      ["org-a", "user-b"].map(createNamePattern),
    ),
  ).toEqual(["org-a", "user-b"]);
  expect(
    appRegistry.resolveIssuerAccounts(["org-*"].map(createNamePattern)),
  ).toEqual(["org-a", "org-c"]);
  expect(
    appRegistry.resolveIssuerAccounts(["user-*"].map(createNamePattern)),
  ).toEqual(["user-b"]);
  expect(
    appRegistry.resolveIssuerAccounts(["*"].map(createNamePattern)),
  ).toEqual(["org-a", "user-b", "org-c"]);
  expect(
    appRegistry.resolveIssuerAccounts(["xxx"].map(createNamePattern)),
  ).toEqual([]);
});

it("doesn't resolve accounts accessible only to non-issuer apps", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const accountB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, accountA, "selected"),
    repos: [],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appBInstallationRegA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, accountB, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationRegA);

  expect(appRegistry.resolveIssuerAccounts([createNamePattern("*")])).toEqual([
    "org-b",
  ]);
});
