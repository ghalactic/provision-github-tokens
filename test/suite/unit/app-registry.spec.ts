import { expect, it } from "vitest";
import { createAppRegistry } from "../../../src/app-registry.js";

it("finds an installation for all repos in an owner with one permission", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
  registry.registerInstallation({
    id: 101,
    app_id: 100,
    app_slug: "app-a",
    repository_selection: "all",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(101, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      owner: "owner-a",
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(101);
});

it("finds an installation for one selected repo with one permission", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(101);
});

it("finds an installation for multiple selected repos with multiple permissions", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
    registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
        owner: "owner-a",
        repositories: ["repo-a"],
        permissions: { repository_projects: want },
      }),
    ).toBe(101);
  },
);

it("finds an installation for a specific app ID", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
  registry.registerApp({ id: 200, slug: "app-b", name: "App B" });
  registry.registerInstallation({
    id: 201,
    app_id: 200,
    app_slug: "app-b",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(201, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
      app: 200,
    }),
  ).toBe(201);
});

it("finds an installation for a specific app slug", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
  registry.registerApp({ id: 200, slug: "app-b", name: "App B" });
  registry.registerInstallation({
    id: 201,
    app_id: 200,
    app_slug: "app-b",
    repository_selection: "selected",
    permissions: { contents: "write" },
  });
  registry.registerInstallationRepositories(201, [
    { owner: { login: "owner-a" }, name: "repo-a" },
  ]);

  expect(
    registry.findInstallationForToken({
      owner: "owner-a",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
      app: "app-b",
    }),
  ).toBe(201);
});

it("doesn't find an installation when it can't access all repos in an owner", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
      owner: "owner-a",
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown repo owner", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
      owner: "owner-x",
      repositories: ["repo-a"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation for an unknown repo", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
      owner: "owner-a",
      repositories: ["repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that can't access all requested repos", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
      owner: "owner-a",
      repositories: ["repo-a", "repo-x"],
      permissions: { contents: "write" },
    }),
  ).toBe(undefined);
});

it("doesn't find an installation that doesn't have all permissions", () => {
  const registry = createAppRegistry();
  registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
    registry.registerApp({ id: 100, slug: "app-a", name: "App A" });
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
