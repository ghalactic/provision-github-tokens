import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setCommits,
  __setErrors,
  __setFiles,
  TestRequestError,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestApps,
  createTestCommit,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import { createTestRepoRegistry } from "../test/repo-registry.js";
import { ValidateError } from "./config/validation.js";
import { ParseYamlError } from "./config/yaml.js";
import { discoverRequesters } from "./discover-requesters.js";
import { repoRefToString } from "./github-reference.js";
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
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB, repoC]]],
  });

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoC.full_name, [
    createTestCommit("cccccccccccccccccccccccccccccccccccccccc", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);

  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
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
                    actions: private`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setFiles(repoC.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
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
      sha: "cccccccccccccccccccccccccccccccccccccccc",
    },
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

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
  expect(discovered).toEqual([
    {
      requester: { account: "org-a", repo: "repo-a" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      config: expect.objectContaining({}) as RequesterConfig,
    },
    {
      requester: { account: "org-a", repo: "repo-c" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "cccccccccccccccccccccccccccccccccccccccc",
      config: expect.objectContaining({}) as RequesterConfig,
    },
  ]);
});

it("discovers requesters in reference order", async () => {
  const [[accountA, [repoB, repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-b", "repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoB, repoA]]],
  });

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoB.full_name, [
    createTestCommit("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens: {}
          provision:
            secrets: {}`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setFiles(repoB.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens: {}
          provision:
            secrets: {}`,
      sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 0 token declarations []
    ::debug::Requester org-a/repo-a has 0 secret declarations []
    ::debug::Discovered requester org-a/repo-b
    ::debug::Requester org-a/repo-b has 0 token declarations []
    ::debug::Requester org-a/repo-b has 0 secret declarations []
    Discovered 2 requesters
    "
  `);
  expect(discovered.map(({ requester }) => repoRefToString(requester))).toEqual(
    ["org-a/repo-a", "org-a/repo-b"],
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
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountB, "selected"]]],
    );

  const appRegistry = createTestAppRegistry(
    createTestRepoRegistry(),
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

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoC.full_name, [
    createTestCommit("cccccccccccccccccccccccccccccccccccccccc", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);

  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
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
                    actions: private`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setFiles(repoC.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
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
                    actions: private`,
      sha: "cccccccccccccccccccccccccccccccccccccccc",
    },
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

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
  expect(discovered).toEqual([
    {
      requester: { account: "org-a", repo: "repo-a" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      config: expect.objectContaining({}) as RequesterConfig,
    },
    {
      requester: { account: "user-b", repo: "repo-c" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "cccccccccccccccccccccccccccccccccccccccc",
      config: expect.objectContaining({}) as RequesterConfig,
    },
  ]);
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
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );

  const appRegistry = createTestAppRegistry(
    createTestRepoRegistry(),
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

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoB.full_name, [
    createTestCommit("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoC.full_name, [
    createTestCommit("cccccccccccccccccccccccccccccccccccccccc", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);

  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setFiles(repoB.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens:
            tokenB:
              repos: [repo-a, repo-c]
              permissions: { metadata: read }`,
      sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  });
  __setFiles(repoC.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens:
            tokenC:
              repos: [repo-b]
              permissions: { metadata: read }`,
      sha: "cccccccccccccccccccccccccccccccccccccccc",
    },
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

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
  expect(discovered).toEqual([
    {
      requester: { account: "org-a", repo: "repo-a" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      config: expect.objectContaining({}) as RequesterConfig,
    },
    {
      requester: { account: "org-a", repo: "repo-b" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      config: expect.objectContaining({}) as RequesterConfig,
    },
    {
      requester: { account: "org-a", repo: "repo-c" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "cccccccccccccccccccccccccccccccccccccccc",
      config: expect.objectContaining({}) as RequesterConfig,
    },
  ]);
});

it("fails over when listing commits fails", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(["App A", {}, [[accountA]]], ["App B", {}, [[accountA]]]);

  const appRegistry = createTestAppRegistry(
    createTestRepoRegistry(),
    {
      app: appA,
      provisioner: true,
      installations: [[appAInstallationA, [repoA]]],
    },
    {
      app: appB,
      provisioner: true,
      installations: [[appBInstallationA, [repoA]]],
    },
  );

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens: {}
          provision:
            secrets: {}`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setErrors("repos.listCommits", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(discovered).toHaveLength(1);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Provisioner app 571481606 installation 3349170939 couldn't discover requester org-a/repo-a: Forbidden
    ::warning::Provisioner couldn't discover requester org-a/repo-a: Forbidden
    ::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 0 token declarations []
    ::debug::Requester org-a/repo-a has 0 secret declarations []
    Discovered 1 requester
    "
  `);
});

it("fails over when reading the config fails", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(["App A", {}, [[accountA]]], ["App B", {}, [[accountA]]]);

  const appRegistry = createTestAppRegistry(
    createTestRepoRegistry(),
    {
      app: appA,
      provisioner: true,
      installations: [[appAInstallationA, [repoA]]],
    },
    {
      app: appB,
      provisioner: true,
      installations: [[appBInstallationA, [repoA]]],
    },
  );

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens: {}
          provision:
            secrets: {}`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setErrors("repos.getContent", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(discovered).toHaveLength(1);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Provisioner app 571481606 installation 3349170939 couldn't discover requester org-a/repo-a: Forbidden
    ::warning::Provisioner couldn't discover requester org-a/repo-a: Forbidden
    ::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 0 token declarations []
    ::debug::Requester org-a/repo-a has 0 secret declarations []
    Discovered 1 requester
    "
  `);
});

it("doesn't fail over when the config no longer exists", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(["App A", {}, [[accountA]]], ["App B", {}, [[accountA]]]);

  const appRegistry = createTestAppRegistry(
    createTestRepoRegistry(),
    {
      app: appA,
      provisioner: true,
      installations: [[appAInstallationA, [repoA]]],
    },
    {
      app: appB,
      provisioner: true,
      installations: [[appBInstallationA, [repoA]]],
    },
  );

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens: {}
          provision:
            secrets: {}`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setErrors("repos.getContent", [new TestRequestError(404)]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(discovered).toEqual([]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Repo org-a/repo-a isn't a requester
    Discovered 0 requesters
    "
  `);
});

it("throws when every provisioner fails", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationA]]] =
    createTestApps(["App A", {}, [[accountA]]], ["App B", {}, [[accountA]]]);

  const appRegistry = createTestAppRegistry(
    createTestRepoRegistry(),
    {
      app: appA,
      provisioner: true,
      installations: [[appAInstallationA, [repoA]]],
    },
    {
      app: appB,
      provisioner: true,
      installations: [[appBInstallationA, [repoA]]],
    },
  );

  const firstError = new TestRequestError(403, {
    message: "Resource not accessible",
  });
  const secondError = new Error("boom");

  __setErrors("repos.listCommits", [firstError, secondError]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  await expect(
    discoverRequesters(findProvisionerOctokit, appRegistry),
  ).rejects.toMatchObject({
    message: "No provisioner could discover requester org-a/repo-a",
    errors: [firstError, secondError],
  });

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Provisioner app 571481606 installation 3349170939 couldn't discover requester org-a/repo-a: Forbidden
    ::warning::Provisioner couldn't discover requester org-a/repo-a: Forbidden
    ::debug::Provisioner app 947161494 installation 4101978852 couldn't discover requester org-a/repo-a: boom
    ::warning::Provisioner couldn't discover requester org-a/repo-a: boom
    "
  `);
});

it("skips requesters with invalid configuration", async () => {
  const [[orgA, [repoA, repoB, repoC]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b", "repo-c"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB, repoC]]],
  });

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoB.full_name, [
    createTestCommit("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoC.full_name, [
    createTestCommit("cccccccccccccccccccccccccccccccccccccccc", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);

  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
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
                      actions: private`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setFiles(repoB.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }
              shared: yes`,
      sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  });
  __setFiles(repoC.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
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
      sha: "cccccccccccccccccccccccccccccccccccccccc",
    },
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 1 secret declaration ["SECRET_A"]
    ::debug::Discovered requester org-a/repo-b
    ::debug::Parsing of requester configuration failed: Invalid requester configuration:
    ::debug::  - must be boolean (/tokens/tokenA/shared)
    ::warning::Requester org-a/repo-b has invalid config
    ::debug::Discovered requester org-a/repo-c
    ::debug::Requester org-a/repo-c has 1 token declaration ["tokenB"]
    ::debug::Requester org-a/repo-c has 1 secret declaration ["SECRET_B"]
    Discovered 2 requesters
    "
  `);
  expect(discovered).toEqual([
    {
      requester: { account: "org-a", repo: "repo-a" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      config: expect.objectContaining({}) as RequesterConfig,
    },
    {
      requester: { account: "org-a", repo: "repo-b" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      configError: expect.any(ValidateError) as Error,
    },
    {
      requester: { account: "org-a", repo: "repo-c" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "cccccccccccccccccccccccccccccccccccccccc",
      config: expect.objectContaining({}) as RequesterConfig,
    },
  ]);
});

it("skips requesters with invalid YAML configuration", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  __setCommits(repoA.full_name, [
    createTestCommit("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);
  __setCommits(repoB.full_name, [
    createTestCommit("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "Add config", [
      ".github/ghalactic/provision-github-tokens.yml",
    ]),
  ]);

  __setFiles(repoA.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens:
            tokenA:
              repos: [repo-b]
              permissions: { metadata: read }`,
      sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  });
  __setFiles(repoB.full_name, {
    ".github/ghalactic/provision-github-tokens.yml": {
      content: `
          tokens: [unclosed`,
      sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    },
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Discovered requester org-a/repo-a
    ::debug::Requester org-a/repo-a has 1 token declaration ["tokenA"]
    ::debug::Requester org-a/repo-a has 0 secret declarations []
    ::debug::Discovered requester org-a/repo-b
    ::debug::Parsing of requester configuration failed: Invalid YAML in org-a/repo-b/.github/ghalactic/provision-github-tokens.yml
    ::warning::Requester org-a/repo-b has invalid config
    Discovered 1 requester
    "
  `);
  expect(discovered).toEqual([
    {
      requester: { account: "org-a", repo: "repo-a" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      config: expect.objectContaining({}) as RequesterConfig,
    },
    {
      requester: { account: "org-a", repo: "repo-b" },
      configPath: ".github/ghalactic/provision-github-tokens.yml",
      configSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      configError: expect.any(ParseYamlError) as Error,
    },
  ]);
});

it("skips requesters whose config no longer exists", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  __setCommits(repoA.full_name, [
    createTestCommit(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "Delete config",
      [".github/ghalactic/provision-github-tokens.yml"],
    ),
  ]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const discovered = await discoverRequesters(
    findProvisionerOctokit,
    appRegistry,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Repo org-a/repo-a isn't a requester
    Discovered 0 requesters
    "
  `);
  expect(discovered).toEqual([]);
});
