import { join } from "node:path";
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
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import {
  createTestApps,
  createTestInstallationAccounts,
  createTestIssue,
} from "../test/github-api.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { ValidateError } from "./config/validation.js";
import {
  DASHBOARD_LABEL,
  FAILURE_DASHBOARD_TITLE,
  renderFailureDashboard,
} from "./dashboard.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import { createRepoRef } from "./github-reference.js";
import { toMarkdown } from "./markdown.js";
import { createReconcileDashboards } from "./reconcile-dashboards.js";
import type { Issue } from "./type/github-api.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { RequesterConfig } from "./type/requester-config.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const fixturesPath = join(import.meta.dirname, "testdata/dashboard/reconcile");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("creates a dashboard when provisioning fails", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getRepoIssueLabels("org-a/repo-a")).toEqual([DASHBOARD_LABEL]);
  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
    labels: [{ name: DASHBOARD_LABEL }],
  });
  await expect(issues[0].body).toMatchFileSnapshot(
    join(fixturesPath, "created.md"),
  );
  expect(__getIssueComments("org-a", "repo-a", 1)).toEqual([]);
});

it("updates a dashboard when its body is stale", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setRepoIssueLabels(subject.repoA.full_name, [DASHBOARD_LABEL]);
  __setIssues(subject.repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      FAILURE_DASHBOARD_TITLE,
      null,
      [DASHBOARD_LABEL],
    ),
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "open" });
  await expect(issues[0].body).toMatchFileSnapshot(
    join(fixturesPath, "updated.md"),
  );
});

it("updates a dashboard even when its body is identical", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  const currentBody = toMarkdown(
    renderFailureDashboard(
      testContext,
      [subject.failingSecret],
      [subject.tokenAuthResult],
      subject.tokenCreationResults,
      subject.provisionResults,
    ).body,
  );

  __setIssues(subject.repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      FAILURE_DASHBOARD_TITLE,
      currentBody,
      [DASHBOARD_LABEL],
    ),
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({
    number: 7,
    state: "open",
    body: currentBody,
  });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([]);
  expect(__getOutput()).toContain("Updated dashboard issue #7 in org-a/repo-a");
});

it("converges to the newest dashboard when several are open", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setIssues(subject.repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      5,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "stale dashboard",
      [DASHBOARD_LABEL],
    ),
    createTestIssue(
      "org-a",
      "repo-a",
      8,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "newest dashboard",
      [DASHBOARD_LABEL],
    ),
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  // TODO: Review assertion approach
  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(2);
  expect(issues[0]).toMatchObject({ number: 5, state: "closed" });
  expect(issues[1]).toMatchObject({
    number: 8,
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
  });
  expect(issues[1].body).toEqual(
    toMarkdown(
      renderFailureDashboard(
        testContext,
        [subject.failingSecret],
        [subject.tokenAuthResult],
        subject.tokenCreationResults,
        subject.provisionResults,
      ).body,
    ),
  );
  expect(__getIssueComments("org-a", "repo-a", 8)).toEqual([]);
  expect(__getOutput()).toContain("Updated dashboard issue #8 in org-a/repo-a");
});

it("closes every open dashboard when nothing is failing", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });

  __setIssues(subject.repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      5,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "stale dashboard",
      [DASHBOARD_LABEL],
    ),
    createTestIssue(
      "org-a",
      "repo-a",
      8,
      "open",
      FAILURE_DASHBOARD_TITLE,
      "newest dashboard",
      [DASHBOARD_LABEL],
    ),
  ]);

  await subject.reconcile(new Map(), subject.tokenCreationResults);

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(2);
  expect(issues[0]).toMatchObject({ number: 5, state: "closed" });
  expect(issues[1]).toMatchObject({ number: 8, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 8)).toEqual([
    "This dashboard will be closed because " +
      "all provisioning issues for this repo have been resolved.",
  ]);
  expect(__getOutput()).toContain("Closed dashboard issue #5 in org-a/repo-a");
  expect(__getOutput()).toContain("Closed dashboard issue #8 in org-a/repo-a");
});

it("closes a dashboard when all provisioned", async () => {
  const subject = setup({ dashboardEnabled: true });
  const tokenAuthResult = createTestTokenAuthResult();
  const targetResult = createTestProvisionAuthTargetResult({
    tokenAuthResult,
  });
  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
    }),
    results: [targetResult],
  });
  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      secret,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "PROVISIONED" }],
      ]),
    ],
  ]);

  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });

  __setIssues(subject.repoA.full_name, [
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

  await subject.reconcile(provisionResults, new Map());

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "This dashboard will be closed because " +
      "all provisioning issues for this repo have been resolved.",
  ]);
});

it("closes dashboards when the provider disables them", async () => {
  const subject = setup({ dashboardEnabled: false });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setIssues(subject.repoA.full_name, [
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

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "This dashboard will be closed because token dashboards are " +
      "disabled in the provider config files.",
  ]);
});

it("closes a dashboard when the requester disables it", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: false }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setIssues(subject.repoA.full_name, [
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

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "This dashboard will be closed because token dashboards are " +
      "disabled in this repo's requester config.",
  ]);
});

it("creates a config issue dashboard", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    configError: new ValidateError("Invalid requester configuration", [
      {
        instancePath: "/tokens/tokenA/shared",
        schemaPath: "#/properties/tokens/additionalProperties",
        keyword: "additionalProperties",
        params: { additionalProperty: "shared" },
        message: "must NOT have additional properties",
      },
    ]),
  });

  await subject.reconcile(new Map(), new Map());

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({
    state: "open",
    title: "Token provisioning config is invalid",
    labels: [{ name: DASHBOARD_LABEL }],
  });
  await expect(issues[0].body).toMatchFileSnapshot(
    join(fixturesPath, "config-issue-created.md"),
  );
});

it("closes a config issue dashboard when the provider disables them", async () => {
  const subject = setup({ dashboardEnabled: false });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    configError: new ValidateError("Invalid requester configuration", []),
  });

  __setIssues(subject.repoA.full_name, [
    createTestIssue(
      "org-a",
      "repo-a",
      7,
      "open",
      "Token provisioning config is invalid",
      "stale body",
      [DASHBOARD_LABEL],
    ),
  ]);

  await subject.reconcile(new Map(), new Map());

  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([
    "This dashboard will be closed because token dashboards are " +
      "disabled in the provider config files.",
  ]);
});

it("does nothing with no open dashboard and nothing failing", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });

  await subject.reconcile(new Map(), new Map());

  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([]);
  expect(__getRepoIssueLabels("org-a/repo-a")).toEqual([]);
});

it("skips repos the installation lacks issues write access for", async () => {
  const subject = setup({ dashboardEnabled: true, noIssuesAccess: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getOutput()).toContain(
    `doesn't have "issues: write" access - skipping dashboard for org-a/repo-a`,
  );
});

it("warns when listing open issues fails", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setErrors("issues.listForRepo", [new TestRequestError(410)]);
  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getOutput()).toContain(
    "Failed to reconcile dashboard for org-a/repo-a",
  );
});

it("does nothing when the provider disables dashboards and no issue exists", async () => {
  const subject = setup({ dashboardEnabled: false });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getIssueComments("org-a", "repo-a", 7)).toEqual([]);
  expect(__getOutput()).toContain("No open dashboard issue in org-a/repo-a");
});

it("reuses the existing label when creating a dashboard", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);
  __setRepoIssueLabels(subject.repoA.full_name, [DASHBOARD_LABEL]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getRepoIssueLabels("org-a/repo-a")).toEqual([DASHBOARD_LABEL]);
  expect(__getIssues("org-a", "repo-a")).toHaveLength(1);
  expect(__getOutput()).toContain("Created dashboard issue #1 in org-a/repo-a");
});

it("surfaces issues creating the dashboard label", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });

  __setErrors("issues.createLabel", [new TestRequestError(422)]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getOutput()).toContain(
    "Failed to reconcile dashboard for org-a/repo-a: " +
      "Unable to create token dashboard label",
  );
});

it("ignores provisioned secrets from other repos", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(
    subject.failingSecret,
    createTestProvisionAuthResult({
      request: createTestProvisionRequest({
        requester: createRepoRef("org-b", "repo-b"),
      }),
    }),
  );

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getIssues("org-a", "repo-a")).toHaveLength(1);
});

it("ignores open issues without the dashboard label", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  const existingIssues: Issue[] = [
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
  ];

  __setIssues(subject.repoA.full_name, existingIssues);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(3);
  expect(issues[1]).toMatchObject({
    number: 2,
    state: "open",
    title: "Some other issue",
    labels: [{ name: "bug" }],
  });
  expect(issues[2]).toMatchObject({
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
  });
});

it("reconciles each requester independently", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.set(subject.repoA.full_name, {
    requester: createRepoRef("org-a", "repo-a"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.discovery.set(subject.repoB.full_name, {
    requester: createRepoRef("org-a", "repo-b"),
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    config: requesterConfig({ dashboardEnabled: true }),
  });
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getIssues("org-a", "repo-a")).toHaveLength(1);
  expect(__getIssues("org-a", "repo-b")).toEqual([]);
});

function setup({
  dashboardEnabled,
  noIssuesAccess = false,
}: {
  dashboardEnabled: boolean;
  noIssuesAccess?: boolean;
}) {
  const [[orgA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    noIssuesAccess ? {} : { issues: "write" },
    [[orgA, "selected"]],
  ]);

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);

  const target = createTestProvisionRequestTarget("actions", "org-a");

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "org-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    },
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target,
    tokenAuthResult,
  });

  const failingSecret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: createRepoRef("org-a", "repo-a"),
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "org-a/repo-a.token-a",
        github: {
          accounts: {
            "org-a": { actions: true },
          },
        },
      }),
      to: [target],
    }),
    results: [targetResult],
  });

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResult, { type: "NO_ISSUER" }],
  ]);

  const reconcile = createReconcileDashboards(findProvisionerOctokit);

  const discovery = new Map<string, DiscoveredRequester>();

  const config: ProviderConfig = {
    dashboards: { enabled: dashboardEnabled },
    permissions: { rules: [] },
    provision: { rules: { secrets: [] } },
  };

  return {
    reconcile: async (
      provisionResults: Map<
        ProvisionAuthResult,
        Map<ProvisionAuthTargetResult, ProvisionResult>
      >,
      tokenCreationResults: Map<TokenAuthResult, TokenCreationResult>,
    ) => {
      await reconcile(
        testContext,
        config,
        discovery,
        [tokenAuthResult],
        tokenCreationResults,
        provisionResults,
      );
    },
    discovery,
    config,
    tokenAuthResult,
    tokenCreationResults,
    failingSecret,
    provisionResults: failingProvisionResults(failingSecret),
    repoA,
    repoB,
  };
}

function requesterConfig({
  dashboardEnabled,
}: {
  dashboardEnabled: boolean;
}): RequesterConfig {
  return {
    $schema: "",
    dashboard: { enabled: dashboardEnabled },
    tokens: {},
    provision: { secrets: {} },
  };
}
function failingProvisionResults(
  secret: ProvisionAuthResult,
  ...moreSecrets: ProvisionAuthResult[]
): Map<ProvisionAuthResult, Map<ProvisionAuthTargetResult, ProvisionResult>> {
  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >();

  for (const authResult of [secret, ...moreSecrets]) {
    const target = authResult.results[0];
    const targetResults = new Map<ProvisionAuthTargetResult, ProvisionResult>([
      [
        target,
        {
          type: "NO_TOKEN",
        },
      ],
    ]);

    provisionResults.set(authResult, targetResults);
  }

  return provisionResults;
}
