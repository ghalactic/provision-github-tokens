import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("finds provisioners for secrets in a GitHub account", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "selected"),
    repos: [],
  };
  const appC: AppRegistration = {
    app: createTestApp(210, "app-c", "App C"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appCInstallationA: InstallationRegistration = {
    installation: createTestInstallation(211, appC.app, orgB, "selected"),
    repos: [],
  };

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerApp(appB);
  registry.registerInstallation(appBInstallationA);
  registry.registerApp(appC);
  registry.registerInstallation(appCInstallationA);

  const request = {
    name: "SECRET_A",
    platform: "github",
    account: "org-a",
  } as const;

  expect(registry.findProvisioners({ ...request, type: "actions" })).toEqual([
    appAInstallationA,
    appBInstallationA,
  ]);
  expect(registry.findProvisioners({ ...request, type: "codespaces" })).toEqual(
    [appAInstallationA, appBInstallationA],
  );
  expect(registry.findProvisioners({ ...request, type: "dependabot" })).toEqual(
    [appAInstallationA, appBInstallationA],
  );
});

it("finds provisioners for secrets in a GitHub repo", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const repoC = createTestInstallationRepo(orgA, "repo-c");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "selected"),
    repos: [repoB],
  };
  const appC: AppRegistration = {
    app: createTestApp(130, "app-c", "App C"),
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appCInstallationA: InstallationRegistration = {
    installation: createTestInstallation(131, appC.app, orgA, "selected"),
    repos: [repoB, repoC],
  };

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerApp(appB);
  registry.registerInstallation(appBInstallationA);
  registry.registerApp(appC);
  registry.registerInstallation(appCInstallationA);

  const requestA = {
    name: "SECRET_A",
    platform: "github",
    account: "org-a",
    repo: "repo-a",
  } as const;
  const requestB = {
    name: "SECRET_A",
    platform: "github",
    account: "org-a",
    repo: "repo-b",
  } as const;

  expect(registry.findProvisioners({ ...requestA, type: "actions" })).toEqual([
    appAInstallationA,
  ]);
  expect(registry.findProvisioners({ ...requestB, type: "actions" })).toEqual([
    appBInstallationA,
    appCInstallationA,
  ]);
  expect(
    registry.findProvisioners({ ...requestA, type: "codespaces" }),
  ).toEqual([appAInstallationA]);
  expect(
    registry.findProvisioners({ ...requestB, type: "codespaces" }),
  ).toEqual([appBInstallationA, appCInstallationA]);
  expect(
    registry.findProvisioners({ ...requestA, type: "dependabot" }),
  ).toEqual([appAInstallationA]);
  expect(
    registry.findProvisioners({ ...requestB, type: "dependabot" }),
  ).toEqual([appBInstallationA, appCInstallationA]);
  expect(
    registry.findProvisioners({
      ...requestA,
      type: "environment",
      environment: "env-a",
    }),
  ).toEqual([appAInstallationA]);
  expect(
    registry.findProvisioners({
      ...requestB,
      type: "environment",
      environment: "env-b",
    }),
  ).toEqual([appBInstallationA, appCInstallationA]);
});

it("finds provisioners for the correct account when there are multiple installations", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallation(appAInstallationB);

  expect(
    registry.findProvisioners({
      name: "SECRET_A",
      platform: "github",
      type: "actions",
      account: "org-a",
    }),
  ).toEqual([appAInstallationA]);
  expect(
    registry.findProvisioners({
      name: "SECRET_A",
      platform: "github",
      type: "actions",
      account: "org-b",
    }),
  ).toEqual([appAInstallationB]);
});

it("doesn't find provisioners for an unknown account", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [],
  };

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findProvisioners({
      name: "SECRET_A",
      platform: "github",
      type: "actions",
      account: "org-x",
    }),
  ).toHaveLength(0);
});

it("doesn't find provisioners from non-provisioner apps", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [],
  };

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findProvisioners({
      name: "SECRET_A",
      platform: "github",
      type: "actions",
      account: "org-a",
    }),
  ).toHaveLength(0);
  expect(
    registry.findProvisioners({
      name: "SECRET_A",
      platform: "github",
      type: "actions",
      account: "org-a",
      repo: "repo-a",
    }),
  ).toHaveLength(0);
});
