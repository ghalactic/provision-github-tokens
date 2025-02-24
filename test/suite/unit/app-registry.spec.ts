import { expect, it } from "vitest";
import { createAppRegistry } from "../../../src/app-registry.js";
import { throws } from "../../error.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("finds token issuers for all repos in an account with one permission", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toEqual([appAInstallationA.id]);
});

it("finds token issuers for one selected repo with one permission", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appAInstallationA.id]);
});

it("finds token issuers for multiple selected repos with multiple permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "write",
    metadata: "read",
  });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA, repoB],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name, repoB.name],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toEqual([appAInstallationA.id]);
});

it("finds token issuers for no repos with no permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [],
      permissions: {},
    }),
  ).toEqual([appAInstallationA.id]);
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
    const appA = createTestApp(110, "app-a", "App A", {
      repository_projects: have,
    });
    const appAInstallationA = createTestInstallation(
      111,
      appA,
      orgA,
      "selected",
      [repoA],
    );

    const registry = createAppRegistry();
    registry.registerApp(
      { enabled: true, roles: ["role-a"] },
      { enabled: false },
      appA,
    );
    registry.registerInstallation(appAInstallationA);
    registry.registerInstallationRepos(
      appAInstallationA.id,
      appAInstallationA.repos,
    );

    expect(
      registry.findTokenIssuers({
        role: "role-a",
        account: orgA.login,
        repos: [repoA.name],
        permissions: { repository_projects: want },
      }),
    ).toEqual([appAInstallationA.id]);
  },
);

it("finds token issuers for the correct account when there are multiple installations", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);
  const appAInstallationB = createTestInstallation(112, appA, orgB, "all", []);

  const registry = createAppRegistry();
  registry.registerApp({ enabled: true, roles: [] }, { enabled: false }, appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );
  registry.registerInstallation(appAInstallationB);
  registry.registerInstallationRepos(
    appAInstallationB.id,
    appAInstallationB.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: "all",
      permissions: {},
    }),
  ).toEqual([appAInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: {},
    }),
  ).toEqual([appAInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgB.login,
      repos: "all",
      permissions: {},
    }),
  ).toEqual([appAInstallationB.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgB.login,
      repos: [],
      permissions: {},
    }),
  ).toEqual([appAInstallationB.id]);
});

it("finds token issuers by role", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const repoC = createTestInstallationRepo(orgA, "repo-c");
  const repoD = createTestInstallationRepo(orgA, "repo-d");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);
  const appB = createTestApp(120, "app-b", "App B", { contents: "write" });
  const appBInstallationA = createTestInstallation(
    121,
    appB,
    orgA,
    "selected",
    [repoA, repoB],
  );
  const appC = createTestApp(130, "app-c", "App C", { contents: "write" });
  const appCInstallationA = createTestInstallation(
    131,
    appC,
    orgA,
    "selected",
    [repoA, repoB, repoC],
  );
  const appD = createTestApp(140, "app-d", "App D", { contents: "write" });
  const appDInstallationA = createTestInstallation(
    141,
    appD,
    orgA,
    "selected",
    [repoB, repoC, repoD],
  );

  const registry = createAppRegistry();
  registry.registerApp({ enabled: true, roles: [] }, { enabled: false }, appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appB,
  );
  registry.registerInstallation(appBInstallationA);
  registry.registerInstallationRepos(
    appBInstallationA.id,
    appBInstallationA.repos,
  );
  registry.registerApp(
    { enabled: true, roles: ["role-b"] },
    { enabled: false },
    appC,
  );
  registry.registerInstallation(appCInstallationA);
  registry.registerInstallationRepos(
    appCInstallationA.id,
    appCInstallationA.repos,
  );
  registry.registerApp(
    { enabled: true, roles: ["role-a", "role-b"] },
    { enabled: false },
    appD,
  );
  registry.registerInstallation(appDInstallationA);
  registry.registerInstallationRepos(
    appDInstallationA.id,
    appDInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appBInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoB.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appBInstallationA.id, appDInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoC.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appDInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-b",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appCInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: "role-b",
      account: orgA.login,
      repos: [repoD.name],
      permissions: { contents: "write" },
    }),
  ).toEqual([appDInstallationA.id]);
});

it("finds token issuers for read access when the role is undefined", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);
  const appB = createTestApp(120, "app-b", "App B", {
    contents: "write",
    repository_projects: "admin",
  });
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp({ enabled: true, roles: [] }, { enabled: false }, appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );
  registry.registerApp({ enabled: true, roles: [] }, { enabled: false }, appB);
  registry.registerInstallation(appBInstallationA);
  registry.registerInstallationRepos(
    appBInstallationA.id,
    appBInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { contents: "read" },
    }),
  ).toEqual([appAInstallationA.id, appBInstallationA.id]);
  expect(
    registry.findTokenIssuers({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { repository_projects: "read" },
    }),
  ).toEqual([appBInstallationA.id]);
});

it("doesn't find token issuers for write or admin access when the role is undefined", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "write",
    repository_projects: "admin",
  });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp({ enabled: true, roles: [] }, { enabled: false }, appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

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
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

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
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

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
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

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
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA],
  );

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findTokenIssuers({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name, "repo-x"],
      permissions: { contents: "write" },
    }),
  ).toHaveLength(0);
});

it("doesn't find token issuers that doesn't have all permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: true, roles: ["role-a"] },
    { enabled: false },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

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
    const appA = createTestApp(110, "app-a", "App A", {
      repository_projects: have,
    });
    const appAInstallationA = createTestInstallation(
      111,
      appA,
      orgA,
      "all",
      [],
    );

    const registry = createAppRegistry();
    registry.registerApp(
      { enabled: true, roles: ["role-a"] },
      { enabled: false },
      appA,
    );
    registry.registerInstallation(appAInstallationA);
    registry.registerInstallationRepos(
      appAInstallationA.id,
      appAInstallationA.repos,
    );

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
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp(
    { enabled: false, roles: ["role-a"] },
    { enabled: true },
    appA,
  );
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

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

it("throws when registering repos for an unknown installation", () => {
  const registry = createAppRegistry();

  expect(
    throws(() => {
      registry.registerInstallationRepos(101, []);
    }),
  ).toMatchInlineSnapshot(`"Installation 101 not registered"`);
});
