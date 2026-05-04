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

it("finds provisioners for accounts", () => {
  const [[orgA], [orgB]] = createTestInstallationAccounts(
    ["Organization", 100, "org-a"],
    ["Organization", 200, "org-b"],
  );
  const appA: AppRegistration = {
    app: createTestApp("App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [],
  };
  const appB: AppRegistration = {
    app: createTestApp("App B"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "selected"),
    repos: [],
  };
  const appC: AppRegistration = {
    app: createTestApp("App C"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appCInstallationA: InstallationRegistration = {
    installation: createTestInstallation(211, appC.app, orgB, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationA);
  appRegistry.registerApp(appC);
  appRegistry.registerInstallation(appCInstallationA);

  expect(appRegistry.findProvisionersForAccount({ account: "org-a" })).toEqual([
    appAInstallationA,
    appBInstallationA,
  ]);
});

it("finds provisioners for the correct account when there are multiple installations", () => {
  const [[orgA], [orgB]] = createTestInstallationAccounts(
    ["Organization", 100, "org-a"],
    ["Organization", 200, "org-b"],
  );
  const appA: AppRegistration = {
    app: createTestApp("App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [],
  };
  const appAInstallationB: InstallationRegistration = {
    installation: createTestInstallation(112, appA.app, orgB, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerInstallation(appAInstallationB);

  expect(appRegistry.findProvisionersForAccount({ account: "org-a" })).toEqual([
    appAInstallationA,
  ]);
  expect(appRegistry.findProvisionersForAccount({ account: "org-b" })).toEqual([
    appAInstallationB,
  ]);
});

it("doesn't find provisioners for an unknown account", () => {
  const [[orgA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
  ]);
  const appA: AppRegistration = {
    app: createTestApp("App A"),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findProvisionersForAccount({ account: "org-x" }),
  ).toHaveLength(0);
});

it("doesn't find provisioners from non-provisioner apps", () => {
  const [[orgA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
  ]);
  const appA: AppRegistration = {
    app: createTestApp("App A"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findProvisionersForAccount({ account: "org-a" }),
  ).toHaveLength(0);
});
