import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setEnvironments,
  __setErrors,
  TestRequestError,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import { createTestRepoRegistry } from "../test/repo-registry.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { createNamePattern } from "./name-pattern.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("resolves environment names for a repo", async () => {
  const [[accountA, [repoA], [[envA1, envA2, envB1, envB2]]]] =
    createTestInstallationAccounts([
      "Organization",
      100,
      "org-a",
      [["repo-a", ["env-a1", "env-a2", "env-b1", "env-b2"]]],
    ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  __setEnvironments([[repoA, [envA1, envA2, envB1, envB2]]]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const environmentResolver = createEnvironmentResolver(findProvisionerOctokit);

  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).toEqual(["env-a1", "env-a2", "env-b1", "env-b2"]);
  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("env-a*")],
    ),
  ).toEqual(["env-a1", "env-a2"]);
  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("env-b*")],
    ),
  ).toEqual(["env-b1", "env-b2"]);
  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("env-a*"), createNamePattern("env-b*")],
    ),
  ).toEqual(["env-a1", "env-a2", "env-b1", "env-b2"]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Repo org-a/repo-a has environments ["env-a1","env-a2","env-b1","env-b2"]
    ::debug::Environment patterns ["*"] for org-a/repo-a resolved to ["env-a1","env-a2","env-b1","env-b2"]
    ::debug::Environment patterns ["env-a*"] for org-a/repo-a resolved to ["env-a1","env-a2"]
    ::debug::Environment patterns ["env-b*"] for org-a/repo-a resolved to ["env-b1","env-b2"]
    ::debug::Environment patterns ["env-a*","env-b*"] for org-a/repo-a resolved to ["env-a1","env-a2","env-b1","env-b2"]
    "
  `);
});

it("falls over to the next provisioner when listing fails", async () => {
  const [[accountA, [repoA], [[envA1]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    [["repo-a", ["env-a1"]]],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
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
      installations: [[appBInstallationB, [repoA]]],
    },
  );

  __setEnvironments([[repoA, [envA1]]]);
  __setErrors("repos.getAllEnvironments", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const environmentResolver = createEnvironmentResolver(findProvisionerOctokit);

  expect(
    await environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).toEqual(["env-a1"]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Provisioner app 571481606 installation 3349170939 couldn't list environments for org-a/repo-a: Forbidden
    ::warning::Provisioner couldn't list environments for org-a/repo-a: Forbidden
    ::debug::Repo org-a/repo-a has environments ["env-a1"]
    ::debug::Environment patterns ["*"] for org-a/repo-a resolved to ["env-a1"]
    "
  `);
});

it("throws an aggregate error after every provisioner fails", async () => {
  const [[accountA, [repoA], [[envA1]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    [["repo-a", ["env-a1"]]],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
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
      installations: [[appBInstallationB, [repoA]]],
    },
  );

  const firstError = new TestRequestError(403, {
    message: "Resource not accessible",
  });
  const secondError = new Error("boom");

  __setEnvironments([[repoA, [envA1]]]);
  __setErrors("repos.getAllEnvironments", [firstError, secondError]);

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const environmentResolver = createEnvironmentResolver(findProvisionerOctokit);

  await expect(
    environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).rejects.toMatchObject({
    message: "No provisioner could list environments for repo org-a/repo-a",
    errors: [firstError, secondError],
  });

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Provisioner app 571481606 installation 3349170939 couldn't list environments for org-a/repo-a: Forbidden
    ::warning::Provisioner couldn't list environments for org-a/repo-a: Forbidden
    ::debug::Provisioner app 947161494 installation 4101978852 couldn't list environments for org-a/repo-a: boom
    ::warning::Provisioner couldn't list environments for org-a/repo-a: boom
    "
  `);
});

it("throws if no provisioner is found", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const environmentResolver = createEnvironmentResolver(findProvisionerOctokit);

  await expect(
    environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).rejects.toThrow("No provisioners found for repo org-a/repo-a");
});
