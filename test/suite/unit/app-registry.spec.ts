import { expect, it } from "vitest";
import { createAppRegistry } from "../../../src/app-registry.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

it("finds an installation for all repos in an owner with one permission", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: "all",
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

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [repoA.name],
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

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [repoA.name, repoB.name],
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

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [],
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

    const registry = createAppRegistry();
    registry.registerApp(["role-a"], appA);
    registry.registerInstallation(appAInstallationA);
    registry.registerInstallationRepositories(
      appAInstallationA.id,
      appAInstallationA.repositories,
    );

    expect(
      registry.findInstallationForToken({
        role: "role-a",
        owner: orgA.login,
        repositories: [repoA.name],
        permissions: { repository_projects: want },
      }),
    ).toBe(appAInstallationA.id);
  },
);

it("finds an installation for the correct owner when there are multiple installations", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);
  const appAInstallationB = createTestInstallation(112, appA, orgB, "all", []);

  const registry = createAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );
  registry.registerInstallation(appAInstallationB);
  registry.registerInstallationRepositories(
    appAInstallationB.id,
    appAInstallationB.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: "all",
      permissions: {},
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [],
      permissions: {},
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgB.login,
      repositories: "all",
      permissions: {},
    }),
  ).toBe(appAInstallationB.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgB.login,
      repositories: [],
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

  const registry = createAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );
  registry.registerApp(["role-a"], appB);
  registry.registerInstallation(appBInstallationA);
  registry.registerInstallationRepositories(
    appBInstallationA.id,
    appBInstallationA.repositories,
  );
  registry.registerApp(["role-b"], appC);
  registry.registerInstallation(appCInstallationA);
  registry.registerInstallationRepositories(
    appCInstallationA.id,
    appCInstallationA.repositories,
  );
  registry.registerApp(["role-a", "role-b"], appD);
  registry.registerInstallation(appDInstallationA);
  registry.registerInstallationRepositories(
    appDInstallationA.id,
    appDInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appBInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [repoB.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appBInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [repoC.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appDInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-b",
      owner: orgA.login,
      repositories: [repoA.name],
      permissions: { contents: "write" },
    }),
  ).toBe(appCInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-b",
      owner: orgA.login,
      repositories: [repoD.name],
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

  const registry = createAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [],
      permissions: { contents: "read" },
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [],
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

  const registry = createAppRegistry();
  registry.registerApp([], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [],
      permissions: { repository_projects: "admin" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation when it can't access all repos in an owner", () => {
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
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown repo owner", () => {
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
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-x",
      repositories: [repoA.name],
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

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: ["repo-x"],
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

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: [repoA.name, "repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that doesn't have all permissions", () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  const registry = createAppRegistry();
  registry.registerApp(["role-a"], appA);
  registry.registerInstallation(appAInstallationA);
  registry.registerInstallationRepositories(
    appAInstallationA.id,
    appAInstallationA.repositories,
  );

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: ["repo-a"],
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

    const registry = createAppRegistry();
    registry.registerApp(["role-a"], appA);
    registry.registerInstallation(appAInstallationA);
    registry.registerInstallationRepositories(
      appAInstallationA.id,
      appAInstallationA.repositories,
    );

    expect(
      registry.findInstallationForToken({
        role: "role-a",
        owner: orgA.login,
        repositories: ["repo-a"],
        permissions: { repository_projects: want },
      }),
    ).toBe(undefined);
  },
);

it("throws when registering repos for an unknown installation", () => {
  const registry = createAppRegistry();

  expect(() => {
    registry.registerInstallationRepositories(101, []);
  }).toThrowError("Installation 101 not registered");
});
