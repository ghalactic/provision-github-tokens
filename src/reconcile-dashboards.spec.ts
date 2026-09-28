import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getIssueComments,
  __getIssues,
  __getRepoIssueLabels,
  __reset as __resetOctokit,
  __setErrors,
  __setIssues,
  __setRepoIssueLabels,
  TestRequestError,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import { testContext } from "../test/context.js";
import {
  createTestApps,
  createTestInstallationAccounts,
  createTestIssue,
} from "../test/github-api.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import { createTestProvisionRequest } from "../test/provision-request.js";
import { createTestProvisionAuthResult } from "../test/result.js";
import { ValidateError } from "./config/validation.js";
import {
  CONFIG_ISSUE_DASHBOARD_TITLE,
  DASHBOARD_LABEL,
  FAILURE_DASHBOARD_TITLE,
} from "./dashboard.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import { createRepoRef } from "./github-reference.js";
import { createReconcileDashboards } from "./reconcile-dashboards.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("creates a dashboard when there are config issues", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        configError: new ValidateError(
          "Invalid requester configuration",
          "/tokens/token-a Property shared is not expected to be here",
        ),
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    new Map(),
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Created dashboard label in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/1
    "
  `);
  expect(__getIssues("org-a", "repo-a")).toEqual([
    expect.objectContaining({
      state: "open",
      title: CONFIG_ISSUE_DASHBOARD_TITLE,
      labels: [{ name: DASHBOARD_LABEL }],
    }),
  ]);
  expect(__getIssueComments("org-a", "repo-a", 1)).toEqual([]);
});

it("creates a dashboard when provisioning fails", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Created dashboard label in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/1
    "
  `);
  expect(__getRepoIssueLabels("org-a/repo-a")).toEqual([DASHBOARD_LABEL]);
  expect(__getIssues("org-a", "repo-a")).toEqual([
    expect.objectContaining({
      state: "open",
      title: FAILURE_DASHBOARD_TITLE,
      body: expect.stringContaining("couldn't provision") as string,
      labels: [{ name: DASHBOARD_LABEL }],
    }),
  ]);
  expect(__getIssueComments("org-a", "repo-a", 1)).toEqual([]);
});

it("updates a dashboard when its body is stale", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "stale dashboard body",
      [DASHBOARD_LABEL],
    ),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 1 open dashboard in org-a/repo-a
    Updated dashboard https://github.example.com/org-a/repo-a/issues/7
    "
  `);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({
    number: 7,
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
  });
  expect(issues[0].body).toContain("couldn't provision");
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([]);
});

it("updates a dashboard on subsequent workflow runs", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );
  await reconcileDashboards(
    {
      ...testContext,
      githubRunAttempt: "2",
      githubRunAttemptUrl:
        "https://github.example.com/actions/runs/123456789/attempts/2",
    },
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Created dashboard label in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/1
    ::debug::Reconciling token dashboards
    ::debug::Found 1 open dashboard in org-a/repo-a
    Updated dashboard https://github.example.com/org-a/repo-a/issues/1
    "
  `);
  expect(issues).toHaveLength(1);
  expect(issues[0].body).toContain("attempts/2");
});

it("closes all but the newest dashboard", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      5,
      "open",
      FAILURE_DASHBOARD_TITLE,
      null,
      [DASHBOARD_LABEL],
    ),
    createTestIssue(
      "org-a",
      "repo-a",
      8,
      "open",
      FAILURE_DASHBOARD_TITLE,
      null,
      [DASHBOARD_LABEL],
    ),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 2 open dashboards in org-a/repo-a
    Closed dashboard https://github.example.com/org-a/repo-a/issues/5
    Updated dashboard https://github.example.com/org-a/repo-a/issues/8
    "
  `);
  expect(issues).toHaveLength(2);
  expect(issues[0]).toMatchObject({ number: 5, state: "closed" });
  expect(issues[1]).toMatchObject({
    number: 8,
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
  });
  expect(__getIssueComments("org-a", "repo-a", 5)).toEqual([
    "Closing this dashboard because another dashboard already exists.",
  ]);
  expect(__getIssueComments("org-a", "repo-a", 8)).toEqual([]);
});

it("closes dashboards when nothing is failing", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      5,
      "open",
      FAILURE_DASHBOARD_TITLE,
      null,
      [DASHBOARD_LABEL],
    ),
    createTestIssue(
      "org-a",
      "repo-a",
      8,
      "open",
      FAILURE_DASHBOARD_TITLE,
      null,
      [DASHBOARD_LABEL],
    ),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    new Map(),
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 2 open dashboards in org-a/repo-a
    Closed dashboard https://github.example.com/org-a/repo-a/issues/5
    Closed dashboard https://github.example.com/org-a/repo-a/issues/8
    "
  `);
  expect(issues).toHaveLength(2);
  expect(issues[0]).toMatchObject({ number: 5, state: "closed" });
  expect(issues[1]).toMatchObject({ number: 8, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 5)).toEqual([
    "Closing this dashboard because another dashboard already exists.",
  ]);
  expect(__getIssueComments("org-a", "repo-a", 8)).toEqual([
    "Closing this dashboard because all issues have been resolved.",
  ]);
});

it("closes dashboards when everything is provisioned", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "PROVISIONED" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "stale body",
      [DASHBOARD_LABEL],
    ),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 1 open dashboard in org-a/repo-a
    Closed dashboard https://github.example.com/org-a/repo-a/issues/7
    "
  `);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "Closing this dashboard because all issues have been resolved.",
  ]);
});

it("closes dashboards when they're disabled by the provider", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: false },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "stale body",
      [DASHBOARD_LABEL],
    ),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 1 open dashboard in org-a/repo-a
    Closed dashboard https://github.example.com/org-a/repo-a/issues/7
    "
  `);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "Closing this dashboard because the provider disabled them.",
  ]);
});

it("closes dashboards when they're disabled by the requester", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: false },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "stale body",
      [DASHBOARD_LABEL],
    ),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 1 open dashboard in org-a/repo-a
    Closed dashboard https://github.example.com/org-a/repo-a/issues/7
    "
  `);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "Closing this dashboard because this repo disabled them.",
  ]);
});

it("doesn't create a dashboard when nothing is failing", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    new Map(),
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    "
  `);
  expect(__getRepoIssueLabels("org-a/repo-a")).toEqual([]);
  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([]);
});

it("doesn't create a dashboard when they're disabled", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: false },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::No open dashboard in org-a/repo-a
    "
  `);
  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([]);
});

it("reuses the existing label when creating dashboards", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setRepoIssueLabels(repoA.full_name, [DASHBOARD_LABEL]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Dashboard label already exists in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/1
    "
  `);
  expect(__getRepoIssueLabels("org-a/repo-a")).toEqual([DASHBOARD_LABEL]);
  expect(__getIssues("org-a", "repo-a")).toHaveLength(1);
});

it("ignores provisioned secrets from other repos", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secretA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
      name: "SECRET_A",
    }),
  });
  const [targetResultA] = secretA.results;

  const secretB = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-b", "repo-b"),
      name: "SECRET_B",
    }),
  });
  const [targetResultB] = secretB.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [secretA, new Map([[targetResultA, { type: "NO_TOKEN" }]])],
    [secretB, new Map([[targetResultB, { type: "NO_TOKEN" }]])],
  ]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Created dashboard label in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/1
    "
  `);
  expect(issues).toHaveLength(1);
  expect(issues[0].body).toContain("SECRET_A");
  expect(issues[0].body).not.toContain("SECRET_B");
});

it("ignores open issues without the dashboard label", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setIssues(repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      1,
      "closed",
      FAILURE_DASHBOARD_TITLE,
      "old",
      [DASHBOARD_LABEL],
    ),
    createTestIssue("org-a", "repo-a", 2, "open", "Some other issue", "body", [
      "bug",
    ]),
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  const issues = __getIssues("org-a", "repo-a");

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Created dashboard label in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/3
    "
  `);
  expect(issues).toHaveLength(3);
  expect(issues[0]).toMatchObject({ number: 1, state: "closed" });
  expect(issues[1]).toMatchObject({
    number: 2,
    state: "open",
    title: "Some other issue",
    labels: [{ name: "bug" }],
  });
  expect(issues[2]).toMatchObject({
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
    labels: [{ name: DASHBOARD_LABEL }],
  });
});

it("reconciles each requester independently", async () => {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
    [
      repoB.full_name,
      {
        requester: createRepoRef("org-a", "repo-b"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Created dashboard label in org-a/repo-a
    Created dashboard https://github.example.com/org-a/repo-a/issues/1
    ::debug::Found 0 open dashboards in org-a/repo-b
    "
  `);
  expect(__getIssues("org-a", "repo-a")).toHaveLength(1);
  expect(__getIssues("org-a", "repo-b")).toEqual([]);
});

it("warns when listing open issues fails", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setErrors("issues.listForRepo", [new TestRequestError(410)]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Failed to reconcile dashboard for org-a/repo-a: HTTP 410
    ::error::Failed to reconcile dashboard for org-a/repo-a
    "
  `);
  expect(__getIssues("org-a", "repo-a")).toEqual([]);
});

it("warns when failing to create the dashboard label", async () => {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });
  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const reconcileDashboards = createReconcileDashboards(findProvisionerOctokit);

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
  });
  const [targetResult] = secret.results;

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([[secret, new Map([[targetResult, { type: "NO_TOKEN" }]])]]);

  const config: ProviderConfig = {
    dashboards: { enabled: true },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  const discovered = new Map<string, DiscoveredRequester>([
    [
      repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        configSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        config: {
          $schema: "",
          dashboard: { enabled: true },
          tokens: {},
          provision: { secrets: {} },
        },
      },
    ],
  ]);

  __setErrors("issues.createLabel", [new TestRequestError(422)]);

  await reconcileDashboards(
    testContext,
    config,
    discovered,
    [],
    new Map(),
    provisionResults,
  );

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Reconciling token dashboards
    ::debug::Found 0 open dashboards in org-a/repo-a
    ::debug::Failed to reconcile dashboard for org-a/repo-a: Unable to create token dashboard label
    ::error::Failed to reconcile dashboard for org-a/repo-a
    "
  `);
  expect(__getIssues("org-a", "repo-a")).toEqual([]);
});
