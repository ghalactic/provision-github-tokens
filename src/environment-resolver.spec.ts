import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setEnvironments,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestApps,
  createTestInstallationAccounts,
  createTestRepoEnvironments,
} from "../test/github-api.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { createNamePattern } from "./name-pattern.js";
import { createOctokitFactory } from "./octokit.js";
import { createFindProvisionerOctokit } from "./provisioner-octokit.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("resolves environment names for a repo", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [envA1, envA2, envB1, envB2] = createTestRepoEnvironments(
    "env-a1",
    "env-a2",
    "env-b1",
    "env-b2",
  );
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  __setEnvironments([[repoA, [envA1, envA2, envB1, envB2]]]);

  const octokitFactory = createOctokitFactory();

  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    [
      {
        appId: appA.id,
        privateKey: appA.privateKey,
        issuer: { enabled: false, roles: [] },
        provisioner: { enabled: true },
      },
    ],
  );

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

  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const octokitFactory = createOctokitFactory();

  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    [
      {
        appId: appA.id,
        privateKey: appA.privateKey,
        issuer: { enabled: true, roles: [] },
        provisioner: { enabled: false },
      },
    ],
  );

  const environmentResolver = createEnvironmentResolver(findProvisionerOctokit);

  await expect(
    environmentResolver.resolveEnvironments(
      { account: "org-a", repo: "repo-a" },
      [createNamePattern("*")],
    ),
  ).rejects.toThrow("No provisioners found for repo org-a/repo-a");
});
