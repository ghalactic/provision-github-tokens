import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setFiles,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import {
  discoverRequesters,
  type DiscoveredRequester,
} from "./discover-requesters.js";
import { createOctokitFactory } from "./octokit.js";
import type { RequesterConfig } from "./type/requester-config.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("discovers requesters in a single account", async () => {
  const [[accountA, [repoA, repoB, repoC]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b", "repo-c"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    {},
    [[111, accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB, repoC]]],
  });

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

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 1 secret declaration ["SECRET_A"]
    ::debug::Repo org-a/repo-b isn't a requester
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
  const [[accountA, [repoA, repoB]], [accountB, [repoC, repoD]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "org-a", ["repo-a", "repo-b"]],
      ["User", 200, "user-b", ["repo-c", "repo-d"]],
    );
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(
      [110, "app-a", "App A", {}, [[111, accountA, "selected"]]],
      [210, "app-b", "App B", {}, [[211, accountB, "selected"]]],
    );

  const appRegistry = createTestAppRegistry(
    {
      app: appA,
      provisioner: true,
      installations: [[appAInstallationA, [repoA, repoB]]],
    },
    {
      app: appB,
      provisioner: true,
      installations: [[appBInstallationA, [repoC, repoD]]],
    },
  );

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

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
    {
      appId: appB.id,
      privateKey: appB.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 1 secret declaration ["SECRET_A"]
    ::debug::Repo org-a/repo-b isn't a requester
    ::debug::Discovered requester user-b/repo-c
    ::debug::Requester user-b/repo-c has 1 token declaration ["tokenA"]
    ::debug::Requester user-b/repo-c has 1 secret declaration ["SECRET_A"]
    ::debug::Repo user-b/repo-d isn't a requester
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
  const [[accountA, [repoA, repoB, repoC]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b", "repo-c"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(
      [110, "app-a", "App A", {}, [[111, accountA, "selected"]]],
      [120, "app-b", "App B", {}, [[121, accountA, "selected"]]],
    );

  const appRegistry = createTestAppRegistry(
    {
      app: appA,
      provisioner: true,
      installations: [[appAInstallationA, [repoA, repoB]]],
    },
    {
      app: appB,
      provisioner: true,
      installations: [[appBInstallationA, [repoB, repoC]]],
    },
  );

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

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
    {
      appId: appB.id,
      privateKey: appB.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
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
  const [[orgA, [repoA, repoB, repoC]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b", "repo-c"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    {},
    [[111, orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB, repoC]]],
  });

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

  const discovered = await discoverRequesters(octokitFactory, appRegistry, [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
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
