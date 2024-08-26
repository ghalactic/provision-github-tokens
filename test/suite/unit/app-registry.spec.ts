import { expect, it } from "vitest";
import { createAppRegistry } from "../../../src/app-registry.js";

it("finds an installation for all repos in an owner with one permission", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "all",
    permissions: { contents: "write" },
  });

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(101);
});

it("finds an installation for one selected repo with one permission", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(101);
});

it("finds an installation for multiple selected repos with multiple permissions", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write", metadata: "read" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
    { owner: { login: "owner-a" }, name: "repo-b" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-a", "repo-b"],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toBe(101);
});

it.each([
  ["write", "read"],
  ["admin", "read"],
  ["admin", "write"],
] as const)(
  "finds an installation when it has higher access (got %s, want %s)",
  (got, want) => {
    const registry = createAppRegistry();
    registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
    registry.registerInstallation({
      id: 101,
      app_id: 100,
      app_slug: "app-a",
      repository_selection: "selected",
      permissions: { repository_projects: got },
    });
    registry.registerInstallationRepositories(101, [
      { owner: { login: "owner-a" }, name: "repo-a" },
    ]);

    expect(
      registry.findInstallationForToken({
        role: "role-a",
        owner: "owner-a",
        repositories: ["repo-a"],
        permissions: { repository_projects: want },
      }),
    ).toBe(101);
  },
);

it("finds an installation by role", () => {
  const registry = createAppRegistry();
  registry.registerApp(undefined, { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "all",
    permissions: { contents: "write" },
  });
  registry.registerApp("role-a", { id: 200, slug: "app-b", name: "App B" });
  registry.registerInstallation({
    id: 201,
    app_id: 200,
    app_slug: "app-b",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(201, [
    { owner: { login: "owner-a" }, name: "repo-a" },
    { owner: { login: "owner-a" }, name: "repo-b" },
  ]);
  registry.registerApp("role-b", { id: 300, slug: "app-c", name: "App C" });
  registry.registerInstallation({
    id: 301,
    app_id: 300,
    app_slug: "app-c",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(301, [
    { owner: { login: "owner-a" }, name: "repo-a" },
    { owner: { login: "owner-a" }, name: "repo-b" },
    { owner: { login: "owner-a" }, name: "repo-c" },
  ]);
  registry.registerApp("role-a", { id: 400, slug: "app-d", name: "App D" });
  registry.registerInstallation({
    id: 401,
    app_id: 400,
    app_slug: "app-d",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(401, [
    { owner: { login: "owner-a" }, name: "repo-b" },
    { owner: { login: "owner-a" }, name: "repo-c" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(201);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-b"],
      permissions: { contents: "write" },
    }),
  ).toBe(201);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-c"],
      permissions: { contents: "write" },
    }),
  ).toBe(401);
  expect(
    registry.findInstallationForToken({
      role: "role-b",
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(301);
});

it("finds an installation for read access when the role is undefined", () => {
  const registry = createAppRegistry();
  registry.registerApp(undefined, { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "all",
    permissions: { contents: "write", repository_projects: "admin" },
  });

  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "read" },
    }),
  ).toBe(101);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { repository_projects: "read" },
    }),
  ).toBe(101);
});

it("doesn't find an installation for write or admin access when the role is undefined", () => {
  const registry = createAppRegistry();
  registry.registerApp(undefined, { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "all",
    permissions: { contents: "write", repository_projects: "admin" },
  });

  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { repository_projects: "admin" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation when it can't access all repos in an owner", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown repo owner", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-x",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown repo", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that can't access all requested repos", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-a", "repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that doesn't have all permissions", () => {
  const registry = createAppRegistry();
  registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write", metadata: "read" },
    }),
  ).toBe(undefined);
});

it.each([
  ["read", "write"],
  ["read", "admin"],
  ["write", "admin"],
] as const)(
  "doesn't find an installation when it has lower access (got %s, want %s)",
  (got, want) => {
    const registry = createAppRegistry();
    registry.registerApp("role-a", { id: 100, slug: "app-a", name: "App A" });
    registry.registerInstallation({
      id: 101,
      app_id: 100,
      app_slug: "app-a",
      repository_selection: "selected",
      permissions: { repository_projects: got },
    });
    registry.registerInstallationRepositories(101, [
      { owner: { login: "owner-a" }, name: "repo-a" },
    ]);

    expect(
      registry.findInstallationForToken({
        role: "role-a",
        owner: "owner-a",
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
