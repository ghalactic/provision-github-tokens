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

it("finds token issuers for all repos in an account with one permission", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toEqual([appAInstallationA.installation.id]);
});

it("finds token issuers for one selected repo with one permission", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appAInstallationA.installation.id]);
});

it("finds token issuers for multiple selected repos with multiple permissions", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name, repoB.name],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toEqual([appAInstallationA.installation.id]);
});

it("finds token issuers for no repos with no permissions", () => {
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
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [],
      permissions: {},
    }),
  ).toEqual([appAInstallationA.installation.id]);
});

it.each([
  ["read", "write"],
  ["read", "admin"],
  ["write", "admin"],
] as const)(
  "finds token issuers when it has higher access (want %s, have %s)",
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

    const registry = createAppRegistry();
    registry.registerApp(appA);
    registry.registerInstallation(appAInstallationA);

    expect(
      registry.findTokenIssuers({
        role: "role-a",
        account: orgA.login,
        repos: [repoA.name],
        permissions: { repository_projects: want },
      }),
    ).toEqual([appAInstallationA.installation.id]);
  },
);

it("finds token issuers for the correct account when there are multiple installations", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA: AppRegistration = {
    app: createTestApp(110, "app-a", "App A"),
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallation(appAInstallationB);

  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: "all",
      permissions: {},
    }),
  ).toEqual([appAInstallationA.installation.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: {},
    }),
  ).toEqual([appAInstallationA.installation.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgB.login,
      repos: "all",
      permissions: {},
    }),
  ).toEqual([appAInstallationB.installation.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgB.login,
      repos: [],
      permissions: {},
    }),
  ).toEqual([appAInstallationB.installation.id]);
});

it("finds token issuers by role", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerApp(appB);
  registry.registerInstallation(appBInstallationA);
  registry.registerApp(appC);
  registry.registerInstallation(appCInstallationA);
  registry.registerApp(appD);
  registry.registerInstallation(appDInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appBInstallationA.installation.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoB.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([
    appBInstallationA.installation.id,
    appDInstallationA.installation.id,
  ]);
  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoC.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appDInstallationA.installation.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-b",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appCInstallationA.installation.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-b",
      account: orgA.login,
      repos: [repoD.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appDInstallationA.installation.id]);
});

it("finds token issuers for read access when the role is undefined", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerApp(appB);
  registry.registerInstallation(appBInstallationA);

  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { contents: "read" },
    }),
  ).toEqual([
    appAInstallationA.installation.id,
    appBInstallationA.installation.id,
  ]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { repository_projects: "read" },
    }),
  ).toEqual([appBInstallationA.installation.id]);
});

it("doesn't find token issuers for write or admin access when the role is undefined", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { repository_projects: "admin" },
    }),
  ).toHaveLength(0);
});

it("doesn't find token issuers when it can't access all repos in an account", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
});

it("doesn't find token issuers for an unknown account", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: "account-x",
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
});

it("doesn't find token issuers for an unknown repo", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: ["repo-x"],
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
});

it("doesn't find token issuers that can't access all requested repos", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name, "repo-x"],
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
});

it("doesn't find token issuers that don't have all permissions", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: ["repo-a"],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toHaveLength(0);
});

it.each([
  ["write", "read"],
  ["admin", "read"],
  ["admin", "write"],
] as const)(
  "doesn't find token issuers when it has lower access (want %s, have %s)",
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

    const registry = createAppRegistry();
    registry.registerApp(appA);
    registry.registerInstallation(appAInstallationA);

    expect(
      registry.findTokenIssuers({
        role: "role-a",
        account: orgA.login,
        repos: ["repo-a"],
        permissions: { repository_projects: want },
      }),
    ).toHaveLength(0);
  },
);

it("doesn't find token issuers from non-issuer apps", () => {
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

  const registry = createAppRegistry();
  registry.registerApp(appA);
  registry.registerInstallation(appAInstallationA);

  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: "all",
      permissions: { contents: "read" },
    }),
  ).toHaveLength(0);
  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
});
