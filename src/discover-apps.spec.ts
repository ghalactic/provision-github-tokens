import { RequestError } from "@octokit/request-error";
import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setApps,
  __setErrors,
  __setInstallations,
} from "../__mocks__/@octokit/action.js";
import {
  createTestApp,
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createAppRegistry } from "./app-registry.js";
import { discoverApps } from "./discover-apps.js";
import { createOctokitFactory } from "./octokit.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("discovers installations with access to all repos", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "read" },
    [[111, orgA]],
  ]);

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    Discovered 1 installation of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers installations with access to selected repos", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "read" },
    [[111, orgA, "selected"]],
  ]);

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to selected repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    Discovered 1 installation of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers installations with access to no repos", async () => {
  const [[orgA]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { members: "read" },
    [[111, orgA, "selected"]],
  ]);

  __setApps([appA]);
  __setInstallations([[appAInstallationA, []]]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"members":"read"}
    ::debug::Installation 111 has access to no repos
    ::debug::Discovered 1 installation of "App A"
    Discovered 1 installation of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [],
  });
});

it("discovers installations with no permissions", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    {},
    [[111, orgA]],
  ]);

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has no permissions
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    Discovered 1 installation of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers installations with roles", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(
      [110, "app-a", "App A", { contents: "write" }, [[111, orgA]]],
      [120, "app-b", "App B", { contents: "write" }, [[121, orgA]]],
    );

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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
      appId: appB.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with roles ["role-a"]
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"write"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 is a token issuer with roles ["role-b","role-c"]
    ::debug::Discovered app 120 installation 121 for account org-a
    ::debug::Installation 121 has permissions {"contents":"write"}
    ::debug::Installation 121 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App B"
    Discovered 2 installations of 2 apps
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: ["role-a"] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(appRegistry.apps.get(appB.id)).toEqual({
    issuer: { enabled: true, roles: ["role-b", "role-c"] },
    provisioner: { enabled: false },
    app: appB,
  });
  expect(appRegistry.installations.get(appBInstallationA.id)).toEqual({
    installation: appBInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers provisioner-only installations", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    {},
    [[111, orgA]],
  ]);

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: {
        enabled: false,
        roles: [],
      },
      provisioner: {
        enabled: true,
      },
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token provisioner
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has no permissions
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    Discovered 1 installation of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("discovers multiple installations of an app", async () => {
  const [[orgA, [repoA]], [orgB, [repoB]]] = createTestInstallationAccounts(
    ["Organization", 1000, "org-a", ["repo-a"]],
    ["Organization", 2000, "org-b", ["repo-b"]],
  );
  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    100,
    "app-a",
    "App A",
    { contents: "read" },
    [
      [101, orgA],
      [102, orgB],
    ],
  ]);

  __setApps([appA]);
  __setInstallations([
    [appAInstallationA, [repoA]],
    [appAInstallationB, [repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 100)
    ::debug::App 100 is a token issuer with no roles
    ::debug::Discovered app 100 installation 101 for account org-a
    ::debug::Installation 101 has permissions {"contents":"read"}
    ::debug::Installation 101 has access to all repos ["org-a/repo-a"]
    ::debug::Discovered app 100 installation 102 for account org-b
    ::debug::Installation 102 has permissions {"contents":"read"}
    ::debug::Installation 102 has access to all repos ["org-b/repo-b"]
    ::debug::Discovered 2 installations of "App A"
    Discovered 2 installations of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA],
  });
  expect(appRegistry.installations.get(appAInstallationB.id)).toEqual({
    installation: appAInstallationB,
    repos: [repoB],
  });
});

it("discovers multiple apps", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(
      [110, "app-a", "App A", { contents: "read" }, [[111, orgA]]],
      [120, "app-b", "App B", { actions: "read" }, [[121, orgA]]],
    );

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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
      appId: appB.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::App 110 is a token provisioner
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 is a token issuer with no roles
    ::debug::App 120 is a token provisioner
    ::debug::Discovered app 120 installation 121 for account org-a
    ::debug::Installation 121 has permissions {"actions":"read"}
    ::debug::Installation 121 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App B"
    Discovered 2 installations of 2 apps
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(appRegistry.apps.get(appB.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: true },
    app: appB,
  });
  expect(appRegistry.installations.get(appBInstallationA.id)).toEqual({
    installation: appBInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips apps with incorrect credentials", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(
      [110, "app-a", "App A", { contents: "read" }, [[101, orgA]]],
      [120, "app-b", "App B", { contents: "read" }, [[102, orgA]]],
    );

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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
      appId: appB.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::App 110 has incorrect credentials - skipping
    ::warning::App at index 0 has incorrect credentials - skipping
    ::debug::Discovered app "App B" (app-b / 120)
    ::debug::App 120 is a token issuer with no roles
    ::debug::Discovered app 120 installation 102 for account org-a
    ::debug::Installation 102 has permissions {"contents":"read"}
    ::debug::Installation 102 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App B"
    Discovered 1 installation of 2 apps
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toBeUndefined();
  expect(appRegistry.apps.get(appB.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appB,
  });
  expect(appRegistry.installations.get(appBInstallationA.id)).toEqual({
    installation: appBInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips non-existent apps", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const appX = createTestApp(999, "app-x", "App X");
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "read" },
    [[101, orgA]],
  ]);

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appX.id,
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
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::App 999 not found - skipping
    ::warning::App at index 0 not found - skipping
    ::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 101 for account org-a
    ::debug::Installation 101 has permissions {"contents":"read"}
    ::debug::Installation 101 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    Discovered 1 installation of 2 apps
    "
  `);
  expect(appRegistry.apps.get(appX.id)).toBeUndefined();
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
});

it("reports unexpected HTTP statuses", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [
    [appA, [appAInstallationA]],
    [appB, [appBInstallationA]],
    [appC, [appCInstallationA]],
  ] = createTestApps(
    [110, "app-a", "App A", { contents: "read" }, [[111, orgA]]],
    [120, "app-b", "App B", { contents: "read" }, [[121, orgA]]],
    [130, "app-c", "App C", { actions: "read" }, [[131, orgA]]],
  );

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
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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
      appId: appB.id,
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
      appId: appC.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    ::debug::Failed to discover app 120: Unexpected HTTP status 999 from GitHub API: <ERROR>
    ::error::Failed to discover app at index 2
    ::debug::Discovered app "App C" (app-c / 130)
    ::debug::App 130 is a token issuer with no roles
    ::debug::Discovered app 130 installation 131 for account org-a
    ::debug::Installation 131 has permissions {"actions":"read"}
    ::debug::Installation 131 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App C"
    Discovered 2 installations of 2 apps
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(appRegistry.apps.get(appB.id)).toBeUndefined();
  expect(appRegistry.apps.get(appC.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appC,
  });
  expect(appRegistry.installations.get(appCInstallationA.id)).toEqual({
    installation: appCInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips apps when discovery throws", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [
    [appA, [appAInstallationA]],
    [appB, [appBInstallationA]],
    [appC, [appCInstallationA]],
  ] = createTestApps(
    [110, "app-a", "App A", { contents: "read" }, [[111, orgA]]],
    [120, "app-b", "App B", { contents: "read" }, [[121, orgA]]],
    [130, "app-c", "App C", { actions: "read" }, [[131, orgA]]],
  );

  __setApps([appA, appB, appC]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
    [appCInstallationA, [repoA, repoB]],
  ]);
  __setErrors("apps.getAuthenticated", [undefined, new Error("<ERROR>")]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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
      appId: appB.id,
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
      appId: appC.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    ::debug::Failed to discover app 120: <ERROR>
    ::error::Failed to discover app at index 2
    ::debug::Discovered app "App C" (app-c / 130)
    ::debug::App 130 is a token issuer with no roles
    ::debug::Discovered app 130 installation 131 for account org-a
    ::debug::Installation 131 has permissions {"actions":"read"}
    ::debug::Installation 131 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App C"
    Discovered 2 installations of 2 apps
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(appRegistry.apps.get(appB.id)).toBeUndefined();
  expect(appRegistry.apps.get(appC.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appC,
  });
  expect(appRegistry.installations.get(appCInstallationA.id)).toEqual({
    installation: appCInstallationA,
    repos: [repoA, repoB],
  });
});

it("skips installations when discovery throws", async () => {
  const [[orgA, [repoA]], [orgB, [repoB]], [orgC, [repoC]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "org-a", ["repo-a"]],
      ["Organization", 200, "org-b", ["repo-b"]],
      ["Organization", 300, "org-c", ["repo-c"]],
    );
  const [[appA, [appAInstallationA, appAInstallationB, appAInstallationC]]] =
    createTestApps([
      110,
      "app-a",
      "App A",
      { contents: "read" },
      [
        [111, orgA, "selected"],
        [112, orgB, "selected"],
        [113, orgC, "selected"],
      ],
    ]);

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
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to selected repos ["org-a/repo-a"]
    ::debug::Failed to discover installation 112 for app 110: <ERROR>
    ::error::Failed to discover installation for app at index 0
    ::debug::Discovered app 110 installation 113 for account org-c
    ::debug::Installation 113 has permissions {"contents":"read"}
    ::debug::Installation 113 has access to selected repos ["org-c/repo-c"]
    ::debug::Discovered 2 installations of "App A"
    ::debug::Failed to discover 1 installation of "App A"
    Discovered 2 installations of 1 app
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA],
  });
  expect(appRegistry.installations.get(appAInstallationB.id)).toBeUndefined();
  expect(appRegistry.installations.get(appAInstallationC.id)).toEqual({
    installation: appAInstallationC,
    repos: [repoC],
  });
});

it("skips apps when they're fully disabled", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [
    [appA, [appAInstallationA]],
    [appB, [appBInstallationA]],
    [appC, [appCInstallationA]],
  ] = createTestApps(
    [110, "app-a", "App A", { contents: "read" }, [[111, orgA]]],
    [120, "app-b", "App B", { contents: "read" }, [[121, orgA]]],
    [130, "app-c", "App C", { actions: "read" }, [[131, orgA]]],
  );

  __setApps([appA, appB, appC]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoA, repoB]],
    [appCInstallationA, [repoA, repoB]],
  ]);

  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  await discoverApps(octokitFactory, appRegistry, [
    {
      appId: appA.id,
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
      appId: appB.id,
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
      appId: appC.id,
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

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered app "App A" (app-a / 110)
    ::debug::App 110 is a token issuer with no roles
    ::debug::Discovered app 110 installation 111 for account org-a
    ::debug::Installation 111 has permissions {"contents":"read"}
    ::debug::Installation 111 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App A"
    ::debug::Skipping discovery of disabled app 120
    ::debug::Discovered app "App C" (app-c / 130)
    ::debug::App 130 is a token issuer with no roles
    ::debug::Discovered app 130 installation 131 for account org-a
    ::debug::Installation 131 has permissions {"actions":"read"}
    ::debug::Installation 131 has access to all repos ["org-a/repo-a","org-a/repo-b"]
    ::debug::Discovered 1 installation of "App C"
    Discovered 2 installations of 3 apps
    "
  `);
  expect(appRegistry.apps.get(appA.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appA,
  });
  expect(appRegistry.installations.get(appAInstallationA.id)).toEqual({
    installation: appAInstallationA,
    repos: [repoA, repoB],
  });
  expect(appRegistry.apps.get(appB.id)).toBeUndefined();
  expect(appRegistry.apps.get(appC.id)).toEqual({
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
    app: appC,
  });
  expect(appRegistry.installations.get(appCInstallationA.id)).toEqual({
    installation: appCInstallationA,
    repos: [repoA, repoB],
  });
});
