import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../../../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setApps,
  __setFiles,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import {
  discoverRequesters,
  type DiscoveredRequester,
} from "../../../src/discover-requesters.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import type { RequesterConfig } from "../../../src/type/requester-config.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("discovers requesters in a single account", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const repoC = createTestInstallationRepo(accountA, "repo-c");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA, repoB, repoC],
  };

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB, repoC]]]);
  __setFiles([
    [
      repoA,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }
          provision:
            secrets:
              SECRET_A:
                token: tokenA
                github:
                  account:
                    actions: true`,
      },
    ],
    [
      repoC,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenB:
              repos: [repo-a, repo-b]
              permissions: { contents: write, metadata: read }
            tokenC:
              repos: [repo-c]
              permissions: { contents: read }
          provision:
            secrets:
              SECRET_B:
                token: tokenB
                github:
                  repo:
                    codespaces: true
              SECRET_C:
                token: tokenC
                github:
                  repo:
                    dependabot: true`,
      },
    ],
  ]);

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: appRegA.issuer,
      provisioner: appRegA.provisioner,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 1 secret declaration ["SECRET_A"]
    ::debug::Repo org-a/repo-b is not a requester
    ::debug::Discovered requester org-a/repo-c
    ::debug::Requester org-a/repo-c has 2 token declarations ["tokenB","tokenC"]
    ::debug::Requester org-a/repo-c has 2 secret declarations ["SECRET_B","SECRET_C"]
    Discovered 2 requesters
    "
  `);
  expect(discovered).toEqual(
    new Map<string, DiscoveredRequester>([
      [
        "org-a/repo-a",
        {
          requester: { account: "org-a", repo: "repo-a" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
      [
        "org-a/repo-c",
        {
          requester: { account: "org-a", repo: "repo-c" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
    ]),
  );
});

it("discovers requesters in multiple account", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const accountB = createTestInstallationAccount("User", 200, "user-b");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const repoC = createTestInstallationRepo(accountB, "repo-c");
  const repoD = createTestInstallationRepo(accountB, "repo-d");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA, repoB],
  };
  const appB = createTestApp(210, "app-b", "App B");
  const appRegB: AppRegistration = {
    app: appB,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationA = createTestInstallation(
    211,
    appB,
    accountB,
    "selected",
  );
  const appBInstallationRegA: InstallationRegistration = {
    installation: appBInstallationA,
    repos: [repoC, repoD],
  };

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoC, repoD]],
  ]);
  __setFiles([
    [
      repoA,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }
          provision:
            secrets:
              SECRET_A:
                token: tokenA
                github:
                  account:
                    actions: true`,
      },
    ],
    [
      repoC,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenA:
              repos: [repo-d]
              permissions: { metadata: read }
          provision:
            secrets:
              SECRET_A:
                token: tokenA
                github:
                  account:
                    actions: true`,
      },
    ],
  ]);

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerApp(appRegB);
  appRegistry.registerInstallation(appBInstallationRegA);

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: appRegA.issuer,
      provisioner: appRegA.provisioner,
    },
    {
      appId: appB.id,
      privateKey: appB.privateKey,
      issuer: appRegB.issuer,
      provisioner: appRegB.provisioner,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 1 secret declaration ["SECRET_A"]
    ::debug::Repo org-a/repo-b is not a requester
    ::debug::Discovered requester user-b/repo-c
    ::debug::Requester user-b/repo-c has 1 token declaration ["tokenA"]
    ::debug::Requester user-b/repo-c has 1 secret declaration ["SECRET_A"]
    ::debug::Repo user-b/repo-d is not a requester
    Discovered 2 requesters
    "
  `);
  expect(discovered).toEqual(
    new Map<string, DiscoveredRequester>([
      [
        "org-a/repo-a",
        {
          requester: { account: "org-a", repo: "repo-a" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
      [
        "user-b/repo-c",
        {
          requester: { account: "user-b", repo: "repo-c" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
    ]),
  );
});

it("only discovers requesters once when multiple providers can access them", async () => {
  const accountA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const repoC = createTestInstallationRepo(accountA, "repo-c");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(
    111,
    appA,
    accountA,
    "selected",
  );
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA, repoB],
  };
  const appB = createTestApp(120, "app-b", "App B");
  const appRegB: AppRegistration = {
    app: appB,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appBInstallationA = createTestInstallation(
    121,
    appB,
    accountA,
    "selected",
  );
  const appBInstallationRegA: InstallationRegistration = {
    installation: appBInstallationA,
    repos: [repoB, repoC],
  };

  __setApps([appA, appB]);
  __setInstallations([
    [appAInstallationA, [repoA, repoB]],
    [appBInstallationA, [repoB, repoC]],
  ]);
  __setFiles([
    [
      repoA,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }`,
      },
    ],
    [
      repoB,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenB:
              repos: [repo-a, repo-c]
              permissions: { metadata: read }`,
      },
    ],
    [
      repoC,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenC:
              repos: [repo-b]
              permissions: { metadata: read }`,
      },
    ],
  ]);

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerApp(appRegB);
  appRegistry.registerInstallation(appBInstallationRegA);

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: appRegA.issuer,
      provisioner: appRegA.provisioner,
    },
    {
      appId: appB.id,
      privateKey: appB.privateKey,
      issuer: appRegB.issuer,
      provisioner: appRegB.provisioner,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 0 secret declarations []
    ::debug::Discovered requester org-a/repo-b
    ::debug::Requester org-a/repo-b has 1 token declaration ["tokenB"]
    ::debug::Requester org-a/repo-b has 0 secret declarations []
    ::debug::Discovered requester org-a/repo-c
    ::debug::Requester org-a/repo-c has 1 token declaration ["tokenC"]
    ::debug::Requester org-a/repo-c has 0 secret declarations []
    Discovered 3 requesters
    "
  `);
  expect(discovered).toEqual(
    new Map<string, DiscoveredRequester>([
      [
        "org-a/repo-a",
        {
          requester: { account: "org-a", repo: "repo-a" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
      [
        "org-a/repo-b",
        {
          requester: { account: "org-a", repo: "repo-b" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
      [
        "org-a/repo-c",
        {
          requester: { account: "org-a", repo: "repo-c" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
    ]),
  );
});

it("skips requesters with invalid configuration", async () => {
  const orgA = createTestInstallationAccount("Organization", 100, "org-a");
  const repoA = createTestInstallationRepo(orgA, "repo-a");
  const repoB = createTestInstallationRepo(orgA, "repo-b");
  const repoC = createTestInstallationRepo(orgA, "repo-c");
  const appA = createTestApp(110, "app-a", "App A");
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: false, roles: [] },
    provisioner: { enabled: true },
  };
  const appAInstallationA = createTestInstallation(111, appA, orgA, "selected");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA, repoB, repoC],
  };

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA, repoB, repoC]]]);
  __setFiles([
    [
      repoA,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
            tokens:
              tokenA:
                repos: [repo-b]
                permissions: { metadata: read }
            provision:
              secrets:
                SECRET_A:
                  token: tokenA
                  github:
                    account:
                      actions: true`,
      },
    ],
    [
      repoB,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }
              shared: yes`,
      },
    ],
    [
      repoC,
      {
        ".github/ghalactic/provision-github-tokens.yml": `
          tokens:
            tokenB:
              repos: [repo-a, repo-b]
              permissions: { contents: write, metadata: read }
          provision:
            secrets:
              SECRET_B:
                token: tokenB
                github:
                  repo:
                    codespaces: true`,
      },
    ],
  ]);

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: appRegA.issuer,
      provisioner: appRegA.provisioner,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 1 secret declaration ["SECRET_A"]
    ::debug::Discovered requester org-a/repo-b
    ::debug::Parsing of requester configuration failed: Invalid requester configuration:
    ::debug::  - must be boolean (/tokens/tokenA/shared)
    ::error::Requester org-a/repo-b has invalid config
    ::debug::Discovered requester org-a/repo-c
    ::debug::Requester org-a/repo-c has 1 token declaration ["tokenB"]
    ::debug::Requester org-a/repo-c has 1 secret declaration ["SECRET_B"]
    Discovered 2 requesters
    "
  `);
  expect(discovered).toEqual(
    new Map<string, DiscoveredRequester>([
      [
        "org-a/repo-a",
        {
          requester: { account: "org-a", repo: "repo-a" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
      [
        "org-a/repo-c",
        {
          requester: { account: "org-a", repo: "repo-c" },
          config: expect.objectContaining({}) as RequesterConfig,
        },
      ],
    ]),
  );
});
