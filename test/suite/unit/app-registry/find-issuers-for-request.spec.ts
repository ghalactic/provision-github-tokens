import { expect, it } from "vitest";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../../github-api.js";

it("finds issuers for all repos in an account with one permission", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
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
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    }),
  ).toEqual([appAInstallationA]);
});

it("finds issuers for one selected repo with one permission", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [repoA.name],
        permissions: { contents: "write" },
      },
      repos: [repoA.name],
    }),
  ).toEqual([appAInstallationA]);
});

it("finds issuers for multiple selected repos with multiple permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", {
      contents: "write",
      metadata: "read",
    }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA, repoB],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [repoA.name, repoB.name],
        permissions: { contents: "write", metadata: "read" },
      },
      repos: [repoA.name, repoB.name],
    }),
  ).toEqual([appAInstallationA]);
});

it("finds issuers for no repos", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { metadata: "read" }),
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
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [],
        permissions: { metadata: "read" },
      },
      repos: [],
    }),
  ).toEqual([appAInstallationA]);
});

it.each([
  ["read", "write"],
  ["read", "admin"],
  ["write", "admin"],
] as const)(
  "finds issuers when it has higher access (want %s, have %s)",
  (want, have) => {
    const orgA = createTestInstallationAccount("Organization", 100, "org-a");
    const repoA = createTestInstallationRepo(orgA, "repo-a");
    const appA: AppRegistration = {
      app: createTestApp(110, "app-a", "App A", { repository_projects: have }),
      issuer: { enabled: true, roles: ["role-a"] },
      provisioner: { enabled: false },
    };
    const appAInstallationA: InstallationRegistration = {
      installation: createTestInstallation(111, appA.app, orgA, "selected"),
      repos: [repoA],
    };

    const appRegistry = createAppRegistry();
    appRegistry.registerApp(appA);
    appRegistry.registerInstallation(appAInstallationA);

    expect(
      appRegistry.findIssuersForRequest({
        consumer: { account: "account-x" },
        declaration: {
          shared: false,
          as: "role-a",
          account: orgA.login,
          repos: [repoA.name],
          permissions: { repository_projects: want },
        },
        repos: [repoA.name],
      }),
    ).toEqual([appAInstallationA]);
  },
);

it("finds issuers for the correct account when there are multiple installations", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { metadata: "read" }),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [],
  };
  const appAInstallationB: InstallationRegistration = {
    installation: createTestInstallation(112, appA.app, orgB, "all"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerInstallation(appAInstallationB);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: "all",
        permissions: { metadata: "read" },
      },
      repos: "all",
    }),
  ).toEqual([appAInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: [],
        permissions: { metadata: "read" },
      },
      repos: [],
    }),
  ).toEqual([appAInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgB.login,
        repos: "all",
        permissions: { metadata: "read" },
      },
      repos: "all",
    }),
  ).toEqual([appAInstallationB]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgB.login,
        repos: [],
        permissions: { metadata: "read" },
      },
      repos: [],
    }),
  ).toEqual([appAInstallationB]);
});

it("finds issuers by role", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const repoC = createTestInstallationRepo(orgA, "repo-c");
  const repoD = createTestInstallationRepo(orgA, "repo-d");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "selected"),
    repos: [repoA, repoB],
  };
  const appC: AppRegistration = {
    app: createTestApp(130, "app-c", "App C", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-b"] },
    provisioner: { enabled: false },
  };
  const appCInstallationA: InstallationRegistration = {
    installation: createTestInstallation(131, appC.app, orgA, "selected"),
    repos: [repoA, repoB, repoC],
  };
  const appD: AppRegistration = {
    app: createTestApp(140, "app-d", "App D", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a", "role-b"] },
    provisioner: { enabled: false },
  };
  const appDInstallationA: InstallationRegistration = {
    installation: createTestInstallation(141, appD.app, orgA, "selected"),
    repos: [repoB, repoC, repoD],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationA);
  appRegistry.registerApp(appC);
  appRegistry.registerInstallation(appCInstallationA);
  appRegistry.registerApp(appD);
  appRegistry.registerInstallation(appDInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [repoA.name],
        permissions: { contents: "write" },
      },
      repos: [repoA.name],
    }),
  ).toEqual([appBInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [repoB.name],
        permissions: { contents: "write" },
      },
      repos: [repoB.name],
    }),
  ).toEqual([appBInstallationA, appDInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [repoC.name],
        permissions: { contents: "write" },
      },
      repos: [repoC.name],
    }),
  ).toEqual([appDInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-b",
        account: orgA.login,
        repos: [repoA.name],
        permissions: { contents: "write" },
      },
      repos: [repoA.name],
    }),
  ).toEqual([appCInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-b",
        account: orgA.login,
        repos: [repoD.name],
        permissions: { contents: "write" },
      },
      repos: [repoD.name],
    }),
  ).toEqual([appDInstallationA]);
});

it("finds issuers for read access when the role is undefined", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [],
  };
  const appB: AppRegistration = {
    app: createTestApp(120, "app-b", "App B", {
      contents: "write",
      repository_projects: "admin",
    }),
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appBInstallationA: InstallationRegistration = {
    installation: createTestInstallation(121, appB.app, orgA, "all"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);
  appRegistry.registerApp(appB);
  appRegistry.registerInstallation(appBInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: [],
        permissions: { contents: "read" },
      },
      repos: [],
    }),
  ).toEqual([appAInstallationA, appBInstallationA]);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: [],
        permissions: { repository_projects: "read" },
      },
      repos: [],
    }),
  ).toEqual([appBInstallationA]);
});

it("doesn't find issuers for write or admin access when the role is undefined", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", {
      contents: "write",
      repository_projects: "admin",
    }),
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
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: [],
        permissions: { contents: "write" },
      },
      repos: [],
    }),
  ).toHaveLength(0);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: [],
        permissions: { repository_projects: "admin" },
      },
      repos: [],
    }),
  ).toHaveLength(0);
});

it("doesn't find issuers when it can't access all repos in an account", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    }),
  ).toHaveLength(0);
});

it("doesn't find issuers for an unknown account", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: "account-x",
        repos: [repoA.name],
        permissions: { contents: "write" },
      },
      repos: [repoA.name],
    }),
  ).toHaveLength(0);
});

it("doesn't find issuers for an unknown repo", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: ["repo-x"],
        permissions: { contents: "write" },
      },
      repos: ["repo-x"],
    }),
  ).toHaveLength(0);
});

it("doesn't find issuers that can't access all requested repos", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "selected"),
    repos: [repoA],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [repoA.name, "repo-x"],
        permissions: { contents: "write" },
      },
      repos: [repoA.name, "repo-x"],
    }),
  ).toHaveLength(0);
});

it("doesn't find issuers that don't have all permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: true, roles: ["role-a"] },
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
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: ["repo-a"],
        permissions: { contents: "write", metadata: "read" },
      },
      repos: ["repo-a"],
    }),
  ).toHaveLength(0);
});

it.each([
  ["write", "read"],
  ["admin", "read"],
  ["admin", "write"],
] as const)(
  "doesn't find issuers when it has lower access (want %s, have %s)",
  (want, have) => {
    const orgA = createTestInstallationAccount("Organization", 100, "org-a");
    const appA: AppRegistration = {
      app: createTestApp(110, "app-a", "App A", { repository_projects: have }),
      issuer: { enabled: true, roles: ["role-a"] },
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
      appRegistry.findIssuersForRequest({
        consumer: { account: "account-x" },
        declaration: {
          shared: false,
          as: "role-a",
          account: orgA.login,
          repos: ["repo-a"],
          permissions: { repository_projects: want },
        },
        repos: ["repo-a"],
      }),
    ).toHaveLength(0);
  },
);

it("doesn't find issuers for no permissions", () => {
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

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: [],
        permissions: {},
      },
      repos: [],
    }),
  ).toHaveLength(0);
});

it("doesn't find issuers from non-issuer apps", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A", { contents: "write" }),
    issuer: { enabled: false, roles: ["role-a"] },
    provisioner: { enabled: true },
  };
  const appAInstallationA: InstallationRegistration = {
    installation: createTestInstallation(111, appA.app, orgA, "all"),
    repos: [],
  };

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appA);
  appRegistry.registerInstallation(appAInstallationA);

  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: undefined,
        account: orgA.login,
        repos: "all",
        permissions: { contents: "read" },
      },
      repos: "all",
    }),
  ).toHaveLength(0);
  expect(
    appRegistry.findIssuersForRequest({
      consumer: { account: "account-x" },
      declaration: {
        shared: false,
        as: "role-a",
        account: orgA.login,
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    }),
  ).toHaveLength(0);
});
