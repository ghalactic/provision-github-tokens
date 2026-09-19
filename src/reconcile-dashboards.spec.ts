import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getIssueComments,
  __getIssues,
  __getRepoLabels,
  __reset as __resetOctokit,
  __setErrors,
  __setIssues,
  __setRepoLabels,
  TestRequestError,
  type TestIssue,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import {
  createTestProvisionAuthResult,
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import {
  DASHBOARD_LABEL,
  FAILURE_DASHBOARD_TITLE,
  renderFailureDashboard,
} from "./dashboard.js";
import type { DiscoverRequestersResult } from "./discover-requesters.js";
import { createRepoRef } from "./github-reference.js";
import { createOctokitFactory } from "./octokit.js";
import { createReconcileDashboards } from "./reconcile-dashboards.js";
import type { ProviderConfig } from "./type/provider-config.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { RequesterConfig } from "./type/requester-config.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

const githubServerUrl = "https://github.example.com";
const runUrl = "https://github.example.com/org-a/repo-a/actions/runs/42";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("creates a dashboard when provisioning fails", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getRepoLabels("org-a/repo-a")).toEqual([DASHBOARD_LABEL]);
  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
    labels: [{ name: DASHBOARD_LABEL }],
  });
  await expect(issues[0].body).toMatchFileSnapshot(
    "./testdata/dashboard/created.md",
  );
  expect(__getIssueComments("org-a", "repo-a")).toEqual([]);
});

it("updates a dashboard when its body is stale", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setRepoLabels(subject.repoA.full_name, [DASHBOARD_LABEL]);
  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 7,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: null,
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "open" });
  await expect(issues[0].body).toMatchFileSnapshot(
    "./testdata/dashboard/updated.md",
  );
});

it("updates a dashboard even when its body is identical", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  const currentBody = renderFailureDashboard(
    runUrl,
    [subject.failingSecret],
    [subject.tokenAuthResult],
    subject.tokenCreationResults,
    subject.provisionResults,
  ).body;

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 7,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: currentBody,
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
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
  expect(__getIssueComments("org-a", "repo-a")).toEqual([]);
  expect(__getOutput()).toContain("Updated dashboard issue #7 in org-a/repo-a");
});

it("converges to the newest dashboard when several are open", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 5,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "stale dashboard",
          labels: [{ name: DASHBOARD_LABEL }],
        },
        {
          number: 8,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "newest dashboard",
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(2);
  expect(issues[0]).toMatchObject({ number: 5, state: "closed" });
  expect(issues[1]).toMatchObject({
    number: 8,
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
  });
  expect(issues[1].body).toBe(
    renderFailureDashboard(
      runUrl,
      [subject.failingSecret],
      [subject.tokenAuthResult],
      subject.tokenCreationResults,
      subject.provisionResults,
    ).body,
  );
  expect(__getIssueComments("org-a", "repo-a")).toEqual([]);
  expect(__getOutput()).toContain("Updated dashboard issue #8 in org-a/repo-a");
});

it("closes every open dashboard when nothing is failing", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 5,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "stale dashboard",
          labels: [{ name: DASHBOARD_LABEL }],
        },
        {
          number: 8,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "newest dashboard",
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(new Map(), subject.tokenCreationResults);

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(2);
  expect(issues[0]).toMatchObject({ number: 5, state: "closed" });
  expect(issues[1]).toMatchObject({ number: 8, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a")).toEqual([
    "#8: This dashboard will be closed because " +
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

  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 7,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "stale body",
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(provisionResults, new Map());

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a")).toEqual([
    "#7: This dashboard will be closed because " +
      "all provisioning issues for this repo have been resolved.",
  ]);
});

it("closes dashboards when the provider disables them", async () => {
  const subject = setup({ dashboardEnabled: false });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 7,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "stale body",
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a")).toEqual([
    "#7: This dashboard will be closed because token dashboards are " +
      "disabled in the provider config files.",
  ]);
});

it("closes a dashboard when the requester disables it", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: false }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 7,
          state: "open",
          title: FAILURE_DASHBOARD_TITLE,
          body: "stale body",
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  const issues = __getIssues("org-a", "repo-a");
  expect(issues[0]).toMatchObject({ number: 7, state: "closed" });
  expect(__getIssueComments("org-a", "repo-a")).toEqual([
    "#7: This dashboard will be closed because token dashboards are " +
      "disabled in this repo's requester config.",
  ]);
});

it("creates a config issue dashboard", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.configIssues = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        errors: [
          {
            instancePath: "/tokens/tokenA/shared",
            schemaPath: "#/properties/tokens/additionalProperties",
            keyword: "additionalProperties",
            params: { additionalProperty: "shared" },
            message: "must NOT have additional properties",
          },
        ],
      },
    ],
  ]);

  await subject.reconcile(new Map(), new Map());

  const issues = __getIssues("org-a", "repo-a");
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({
    state: "open",
    title: "Token provisioning config is invalid",
    labels: [{ name: DASHBOARD_LABEL }],
  });
  await expect(issues[0].body).toMatchFileSnapshot(
    "./testdata/dashboard/config-issue-created.md",
  );
});

it("closes a config issue dashboard when the provider disables them", async () => {
  const subject = setup({ dashboardEnabled: false });
  subject.discovery.configIssues = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        configPath: ".github/ghalactic/provision-github-tokens.yml",
        errors: [],
      },
    ],
  ]);

  __setIssues([
    [
      subject.repoA.full_name,
      [
        {
          number: 7,
          state: "open",
          title: "Token provisioning config is invalid",
          body: "stale body",
          labels: [{ name: DASHBOARD_LABEL }],
        },
      ],
    ],
  ]);

  await subject.reconcile(new Map(), new Map());

  expect(__getIssueComments("org-a", "repo-a")).toEqual([
    "#7: This dashboard will be closed because token dashboards are " +
      "disabled in the provider config files.",
  ]);
});

it("does nothing with no open dashboard and nothing failing", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);

  await subject.reconcile(new Map(), new Map());

  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getIssueComments("org-a", "repo-a")).toEqual([]);
  expect(__getRepoLabels("org-a/repo-a")).toEqual([]);
});

it("skips repos the installation lacks issues write access for", async () => {
  const subject = setup({ dashboardEnabled: true, noIssuesAccess: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
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
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
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
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getIssues("org-a", "repo-a")).toEqual([]);
  expect(__getIssueComments("org-a", "repo-a")).toEqual([]);
  expect(__getOutput()).toContain("No open dashboard issue in org-a/repo-a");
});

it("reuses the existing label when creating a dashboard", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);
  __setRepoLabels(subject.repoA.full_name, [DASHBOARD_LABEL]);

  await subject.reconcile(
    subject.provisionResults,
    subject.tokenCreationResults,
  );

  expect(__getRepoLabels("org-a/repo-a")).toEqual([DASHBOARD_LABEL]);
  expect(__getIssues("org-a", "repo-a")).toHaveLength(1);
  expect(__getOutput()).toContain("Created dashboard issue #1 in org-a/repo-a");
});

it("ignores provisioned secrets from other repos", async () => {
  const subject = setup({ dashboardEnabled: true });
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
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
  subject.discovery.requesters = new Map([
    [
      subject.repoA.full_name,
      {
        requester: createRepoRef("org-a", "repo-a"),
        config: requesterConfig({ dashboardEnabled: true }),
      },
    ],
  ]);
  subject.provisionResults = failingProvisionResults(subject.failingSecret);

  const stickerIssues: TestIssue[] = [
    {
      number: 1,
      state: "closed",
      title: FAILURE_DASHBOARD_TITLE,
      body: "old",
      labels: [{ name: DASHBOARD_LABEL }],
    },
    {
      number: 2,
      state: "open",
      title: "Some other issue",
      body: "body",
      labels: ["bug"],
    },
  ];

  __setIssues([[subject.repoA.full_name, stickerIssues]]);

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
    labels: ["bug"],
  });
  expect(issues[2]).toMatchObject({
    state: "open",
    title: FAILURE_DASHBOARD_TITLE,
  });
});

function setup({
  dashboardEnabled,
  noIssuesAccess = false,
}: {
  dashboardEnabled: boolean;
  noIssuesAccess?: boolean;
}) {
  const [[orgA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "org-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    noIssuesAccess ? {} : { issues: "write" },
    [[orgA, "selected"]],
  ]);

  createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

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

  const reconcile = createReconcileDashboards(createOctokitFactory(), [
    {
      appId: appA.id,
      privateKey: appA.privateKey,
      issuer: { enabled: false, roles: [] },
      provisioner: { enabled: true },
    },
  ]);

  const discovery: DiscoverRequestersResult = {
    requesters: new Map(),
    configIssues: new Map(),
    installations: new Map([
      [repoA.full_name, { installation: appAInstallationA, repos: [repoA] }],
    ]),
  };

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
        githubServerUrl,
        runUrl,
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
