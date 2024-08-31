import { debug, info } from "@actions/core";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  __reset,
  __setApps,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import { createAppRegistry } from "../../../src/app-registry.js";
import { discoverApps } from "../../../src/discover-apps.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

let output = "";

beforeAll(() => {
  vi.mocked(debug).mockImplementation((message) => {
    output += `::debug::${message}\n`;
  });
  vi.mocked(info).mockImplementation((message) => {
    output += `${message}\n`;
  });
});

beforeEach(() => {
  output = "";
  __reset();
});

it("discovers installations with access to all repos", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  __setApps([appA]);
  __setInstallations([appAInstallationA]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: [],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 has no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repositories in account org-a
    Discovered 1 installation of "App A"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: "all",
      permissions: { contents: "read" },
    }),
  ).toBe(appAInstallationA.id);
});

it("discovers installations with access to selected repos", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [repoA, repoB],
  );

  __setApps([appA]);
  __setInstallations([appAInstallationA]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: [],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 has no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to repositories ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [repoA.name, repoB.name],
      permissions: { contents: "read" },
    }),
  ).toBe(appAInstallationA.id);
});

it("discovers installations with access to no repos", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { members: "read" });
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    orgA,
    "selected",
    [],
  );

  __setApps([appA]);
  __setInstallations([appAInstallationA]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: [],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 has no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"members":"read"}
    ::debug::Installation 111 has access to no repositories
    Discovered 1 installation of "App A"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: [],
      permissions: { members: "read" },
    }),
  ).toBe(appAInstallationA.id);
});

it("discovers installations with no permissions", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  __setApps([appA]);
  __setInstallations([appAInstallationA]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: [],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 has no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has no permissions
    ::debug::Installation 111 has access to all repositories in account org-a
    Discovered 1 installation of "App A"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: "all",
      permissions: {},
    }),
  ).toBe(appAInstallationA.id);
});

it("discovers installations with roles", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);

  __setApps([appA]);
  __setInstallations([appAInstallationA]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: ["role-a", "role-b"],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 has roles ["role-a","role-b"]
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"write"}
    ::debug::Installation 111 has access to all repositories in account org-a
    Discovered 1 installation of "App A"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: "role-a",
      owner: orgA.login,
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: "role-b",
      owner: orgA.login,
      repositories: "all",
      permissions: { contents: "write" },
    }),
  ).toBe(appAInstallationA.id);
});

it("discovers multiple installations of an app", async () => {
  const orgA = createTestInstallationAccount("Organization", 1000, "org-a");
  const orgB = createTestInstallationAccount("Organization", 2000, "org-a");
  const appA = createTestApp(100, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(101, appA, orgA, "all", []);
  const appAInstallationB = createTestInstallation(102, appA, orgB, "all", []);

  __setApps([appA]);
  __setInstallations([appAInstallationA, appAInstallationB]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: [],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 100)
    ::debug::App 100 has no roles
    ::debug::Discovered app installation 101 for account org-a
    ::debug::Installation 101 has permissions {"contents":"read"}
    ::debug::Installation 101 has access to all repositories in account org-a
    ::debug::Discovered app installation 102 for account org-a
    ::debug::Installation 102 has permissions {"contents":"read"}
    ::debug::Installation 102 has access to all repositories in account org-a
    Discovered 2 installations of "App A"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: "all",
      permissions: { contents: "read" },
    }),
  ).toBe(appAInstallationA.id);
});

it("discovers multiple apps", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appB = createTestApp(120, "app-b", "App B", { actions: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all", []);
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all", []);

  __setApps([appA, appB]);
  __setInstallations([appAInstallationA, appBInstallationA]);

  const registry = createAppRegistry();
  await discoverApps(registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      roles: [],
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      roles: [],
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 has no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repositories in account org-a
    Discovered 1 installation of "App A"
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 has no roles
    ::debug::Discovered app installation 121 for account org-a
    ::debug::Installation 121 has permissions {"actions":"read"}
    ::debug::Installation 121 has access to all repositories in account org-a
    Discovered 1 installation of "App B"
    "
  `);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: "all",
      permissions: { contents: "read" },
    }),
  ).toBe(appAInstallationA.id);
  expect(
    registry.findInstallationForToken({
      role: undefined,
      owner: orgA.login,
      repositories: "all",
      permissions: { actions: "read" },
    }),
  ).toBe(appBInstallationA.id);
});
