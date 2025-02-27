import { debug, error, info } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  __reset,
  __setApps,
  __setErrors,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import { createAppRegistry } from "../../../src/app-registry.js";
import { discoverApps } from "../../../src/discover-apps.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";
import { stripStacks } from "../../output.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

let output = "";

beforeAll(() => {
  vi.mocked(debug).mockImplementation((message) => {
    output += `::debug::${message}\n`;
  });
  vi.mocked(error).mockImplementation((message) => {
    output += `::error::${message}\n`;
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
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers installations with access to selected repos", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "selected");

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to selected repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers installations with access to no repos", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const appA = createTestApp(110, "app-a", "App A", { members: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "selected");

  __setApps([appA]);
  __setInstallations([[appAInstallationA, []]]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"members":"read"}
    ::debug::Installation 111 has access to no repos
    Discovered 1 installation of "App A"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [],
  });
});

it("discovers installations with no permissions", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A");
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has no permissions
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers installations with roles", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appB = createTestApp(120, "app-b", "App B", { contents: "write" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all");

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: ["role-a"],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      issuer: {
        enabled: true,
        roles: ["role-b", "role-c"],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with roles ["role-a"]
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"write"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A" with role "role-a"
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 is a token issuer with roles ["role-b","role-c"]
    ::debug::Discovered app installation 121 for account org-a
    ::debug::Installation 121 has permissions {"contents":"write"}
    ::debug::Installation 121 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App B" with roles "role-b", "role-c"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(registry.apps.get(appB.id)).toEqual({
    issuer: { enabled: true, roles: ["role-b", "role-c"] },
    provisioner: { enabled: false },
    app: appB,
  });
  expect(registry.installations.get(appBInstallationA.id)).toEqual({
    installation: appBInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers multiple installations of an app", async () => {
  const orgA = createTestInstallationAccount("Organization", 1000, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const orgB = createTestInstallationAccount("Organization", 2000, "org-b");
  const repoB = createTestInstallationRepo(orgB, "repo-b");
  const appA = createTestApp(100, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(101, appA, orgA, "all");
  const appAInstallationB = createTestInstallation(102, appA, orgB, "all");

  __setApps([appA]);
  __setInstallations([
    [appAInstallationA, [repoA]],
    [appAInstallationB, [repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 100)
    ::debug::App 100 is a token issuer with no roles
    ::debug::Discovered app installation 101 for account org-a
    ::debug::Installation 101 has permissions {"contents":"read"}
    ::debug::Installation 101 has access to all repos ["org-a/repo-a"]
    ::debug::Discovered app installation 102 for account org-b
    ::debug::Installation 102 has permissions {"contents":"read"}
    ::debug::Installation 102 has access to all repos ["org-b/repo-b"]
    Discovered 2 installations of "App A"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA],
  });
  expect(registry.installations.get(appAInstallationB.id)).toEqual({
    installation: appAInstallationB,
    repos: [repoB],
  });
});

it("discovers multiple apps", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appB = createTestApp(120, "app-b", "App B", { actions: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all");

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: true,
      },
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: true,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::App 110 is a token provisioner
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 is a token issuer with no roles
    ::debug::App 120 is a token provisioner
    ::debug::Discovered app installation 121 for account org-a
    ::debug::Installation 121 has permissions {"actions":"read"}
    ::debug::Installation 121 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App B"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(registry.apps.get(appB.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
    app: appB,
  });
  expect(registry.installations.get(appBInstallationA.id)).toEqual({
    installation: appBInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips apps with incorrect credentials", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appB = createTestApp(120, "app-b", "App B", { contents: "read" });
  const appAInstallationA = createTestInstallation(101, appA, orgA, "all");
  const appBInstallationA = createTestInstallation(102, appB, orgA, "all");

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: "incorrect",
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::App 110 has incorrect credentials - skipping
    App at index 0 has incorrect credentials - skipping
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 is a token issuer with no roles
    ::debug::Discovered app installation 102 for account org-a
    ::debug::Installation 102 has permissions {"contents":"read"}
    ::debug::Installation 102 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App B"
    "
  `);
  expect(registry.apps.get(appA.id)).toBeUndefined();
  expect(registry.apps.get(appB.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appB,
  });
  expect(registry.installations.get(appBInstallationA.id)).toEqual({
    installation: appBInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips non-existent apps", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appX = createTestApp(999, "app-x", "App X");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(101, appA, orgA, "all");

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appX.id),
      privateKey: appX.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(output).toMatchInlineSnapshot(`
    "::debug::App 999 not found - skipping
    App at index 0 not found - skipping
    ::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 101 for account org-a
    ::debug::Installation 101 has permissions {"contents":"read"}
    ::debug::Installation 101 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    "
  `);
  expect(registry.apps.get(appX.id)).toBeUndefined();
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("reports unexpected HTTP statuses", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appB = createTestApp(120, "app-b", "App B", { contents: "read" });
  const appC = createTestApp(130, "app-c", "App C", { actions: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all");
  const appCInstallationA = createTestInstallation(131, appC, orgA, "all");

  __setApps([appA, appB, appC]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
    [appCInstallationA, [repoA, repoB]],
  ]);
  __setErrors("apps.getAuthenticated", [
    undefined,
    new RequestError("<ERROR>", 999, {
      request: { method: "GET", url: "https://api.org/", headers: {} },
    }),
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appC.id),
      privateKey: appC.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(stripStacks(output)).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    ::debug::Failed to discover app 120: Error: Unexpected HTTP status 999 from GitHub API: <ERROR>
    ::error::Failed to discover app at index 2
    ::debug::Discovered app "App C" (app-c / 130)
    ::debug::App 130 is a token issuer with no roles
    ::debug::Discovered app installation 131 for account org-a
    ::debug::Installation 131 has permissions {"actions":"read"}
    ::debug::Installation 131 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App C"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(registry.apps.get(appB.id)).toBeUndefined();
  expect(registry.apps.get(appC.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appC,
  });
  expect(registry.installations.get(appCInstallationA.id)).toEqual({
    installation: appCInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips apps when discovery throws", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appB = createTestApp(120, "app-b", "App B", { contents: "read" });
  const appC = createTestApp(130, "app-c", "App C", { actions: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all");
  const appCInstallationA = createTestInstallation(131, appC, orgA, "all");

  __setApps([appA, appB, appC]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
    [appCInstallationA, [repoA, repoB]],
  ]);
  __setErrors("apps.getAuthenticated", [undefined, new Error("<ERROR>")]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appC.id),
      privateKey: appC.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(stripStacks(output)).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    ::debug::Failed to discover app 120: Error: <ERROR>
    ::error::Failed to discover app at index 2
    ::debug::Discovered app "App C" (app-c / 130)
    ::debug::App 130 is a token issuer with no roles
    ::debug::Discovered app installation 131 for account org-a
    ::debug::Installation 131 has permissions {"actions":"read"}
    ::debug::Installation 131 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App C"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(registry.apps.get(appB.id)).toBeUndefined();
  expect(registry.apps.get(appC.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appC,
  });
  expect(registry.installations.get(appCInstallationA.id)).toEqual({
    installation: appCInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips installations when discovery throws", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const orgB = createTestInstallationAccount("Organization", 200, "org-b");
  const repoB = createTestInstallationRepo(orgB, "repo-b");
  const orgC = createTestInstallationAccount("Organization", 300, "org-c");
  const repoC = createTestInstallationRepo(orgC, "repo-c");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "selected");
  const appAInstallationB = createTestInstallation(112, appA, orgB, "selected");
  const appAInstallationC = createTestInstallation(113, appA, orgC, "selected");

  __setApps([appA]);
  __setInstallations([
    [appAInstallationA, [repoA]],
    [appAInstallationB, [repoB]],
    [appAInstallationC, [repoC]],
  ]);
  __setErrors("apps.listReposAccessibleToInstallation", [
    undefined,
    new Error("<ERROR>"),
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(stripStacks(output)).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to selected repos ["org-a/repo-a"]
    ::debug::Failed to discover installation 112 for app 110: Error: <ERROR>
    ::error::Failed to discover installation for app at index 0
    ::debug::Discovered app installation 113 for account org-c
    ::debug::Installation 113 has permissions {"contents":"read"}
    ::debug::Installation 113 has access to selected repos ["org-c/repo-c"]
    Discovered 2 installations of "App A"
    Failed to discover 1 installation of "App A"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA],
  });
  expect(registry.installations.get(appAInstallationB.id)).toBeUndefined();
  expect(registry.installations.get(appAInstallationC.id)).toEqual({
    installation: appAInstallationC,
    repos: [repoC],
  });
});

it("skips apps when they're fully disabled", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { contents: "read" });
  const appB = createTestApp(120, "app-b", "App B", { contents: "read" });
  const appC = createTestApp(130, "app-c", "App C", { actions: "read" });
  const appAInstallationA = createTestInstallation(111, appA, orgA, "all");
  const appBInstallationA = createTestInstallation(121, appB, orgA, "all");
  const appCInstallationA = createTestInstallation(131, appC, orgA, "all");

  __setApps([appA, appB, appC]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
    [appCInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const registry = createAppRegistry();
  await discoverApps(octokitFactory, registry, [
    {
      appId: String(appA.id),
      privateKey: appA.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appB.id),
      privateKey: appB.privateKey,
      issuer: {
        enabled: false,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
    {
      appId: String(appC.id),
      privateKey: appC.privateKey,
      issuer: {
        enabled: true,
        roles: [],
      },
      provisioner: {
        enabled: false,
      },
    },
  ]);

  expect(stripStacks(output)).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App A"
    ::debug::Skipping discovery of disabled app 120
    ::debug::Discovered app "App C" (app-c / 130)
    ::debug::App 130 is a token issuer with no roles
    ::debug::Discovered app installation 131 for account org-a
    ::debug::Installation 131 has permissions {"actions":"read"}
    ::debug::Installation 131 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    Discovered 1 installation of "App C"
    "
  `);
  expect(registry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(registry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(registry.apps.get(appB.id)).toBeUndefined();
  expect(registry.apps.get(appC.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appC,
  });
  expect(registry.installations.get(appCInstallationA.id)).toEqual({
    installation: appCInstallationA,
    repos: [repoA, repoB],
  });
});
