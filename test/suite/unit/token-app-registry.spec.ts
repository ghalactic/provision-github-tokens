import { expect, it } from "vitest";
import { createTokenAppRegistry } from "../../../src/token-app-registry.js";
import { throws } from "../../error.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("finds an installation for all repos in an account with one permission", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(appAInstallationA.id);
});

it("finds an installation for one selected repo with one permission", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appAInstallationA.id);
});

it("finds an installation for multiple selected repos with multiple permissions", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name, repoB.name],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toBe(appAInstallationA.id);
});

it("finds an installation for no repos with no permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [],
  );

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [],
      permissions: {},
    }),
  ).toBe(appAInstallationA.id);
});

it.each([
  ["read", "write"],
  ["read", "admin"],
  ["write", "admin"],
] as const)(
  "finds an installation when it has higher access (want %s, have %s)",
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

    const registry = createTokenAppRegistry();
    registry.registerApp(["role-a"], appA);
    registry.registerInstallation(appAInstallationA);
    registry.registerInstallationRepos(
      appAInstallationA.id,
      appAInstallationA.repos,
    );

    expect(
      registry.findInstallationForToken({
        role: "role-a",
        account: orgA.login,
        repos: [repoA.name],
        permissions: { repository_projects: want },
      }),
    ).toBe(appAInstallationA.id);
  },
);

it("finds an installation for the correct account when there are multiple installations", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);
  const appAInstallationB = createTestInstallation(112, appA, orgB, "all", []);

  const registry = createTokenAppRegistry();
  registry.registerApp([], appA);
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
    registry.findInstallationForToken({
      role: undefined,
      account: orgA.login,
      repos: "all",
      permissions: {},
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: {},
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgB.login,
      repos: "all",
      permissions: {},
    }),
  ).toBe(appAInstallationB.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgB.login,
      repos: [],
      permissions: {},
    }),
  ).toBe(appAInstallationB.id);
});

it("finds an installation by role", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );
  registry.registerApp(["role-a"], appB);
  registry.registerInstallation(appBInstallationA);
  registry.registerInstallationRepos(
    appBInstallationA.id,
    appBInstallationA.repos,
  );
  registry.registerApp(["role-b"], appC);
  registry.registerInstallation(appCInstallationA);
  registry.registerInstallationRepos(
    appCInstallationA.id,
    appCInstallationA.repos,
  );
  registry.registerApp(["role-a", "role-b"], appD);
  registry.registerInstallation(appDInstallationA);
  registry.registerInstallationRepos(
    appDInstallationA.id,
    appDInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appBInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [repoB.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appBInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [repoC.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appDInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-b",
      account: orgA.login,
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appCInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-b",
      account: orgA.login,
      repos: [repoD.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appDInstallationA.id);
});

it("finds an installation for read access when the role is undefined", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "write",
    repository_projects: "admin",
  });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createTokenAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { contents: "read" },
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { repository_projects: "read" },
    }),
  ).toBe(appAInstallationA.id);
});

it("doesn't find an installation for write or admin access when the role is undefined", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", {
    contents: "write",
    repository_projects: "admin",
  });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createTokenAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      account: orgA.login,
      repos: [],
      permissions: { repository_projects: "admin" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation when it can't access all repos in an account", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown account", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: "account-x",
      repos: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown repo", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: ["repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that can't access all requested repos", () => {
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

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: [repoA.name, "repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that doesn't have all permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createTokenAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepos(
    appAInstallationA.id,
    appAInstallationA.repos,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      account: orgA.login,
      repos: ["repo-a"],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toBe(undefined);
});

it.each([
  ["write", "read"],
  ["admin", "read"],
  ["admin", "write"],
] as const)(
  "doesn't find an installation when it has lower access (want %s, have %s)",
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

    const registry = createTokenAppRegistry();
    registry.registerApp(["role-a"], appA);
    registry.registerInstallation(appAInstallationA);
    registry.registerInstallationRepos(
      appAInstallationA.id,
      appAInstallationA.repos,
    );

    expect(
      registry.findInstallationForToken({
        role: "role-a",
        account: orgA.login,
        repos: ["repo-a"],
        permissions: { repository_projects: want },
      }),
    ).toBe(undefined);
  },
);

it("throws when registering repos for an unknown installation", () => {
  const registry = createTokenAppRegistry();

  expect(
    throws(() => {
      registry.registerInstallationRepos(101, []);
    }),
  ).toMatchInlineSnapshot(`"Installation 101 not registered"`);
});
