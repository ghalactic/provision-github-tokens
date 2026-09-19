import { RequestError } from "@octokit/request-error";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../test/declaration.js";
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
  CONFIG_ISSUE_DASHBOARD_TITLE,
  FAILURE_DASHBOARD_TITLE,
  renderConfigIssueDashboard,
  renderFailureDashboard,
} from "./dashboard.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

const fixturesPath = join(import.meta.dirname, "testdata/dashboard");
const githubServerUrl = "https://github.example.com";
const runUrl = "https://github.example.com/account-x/repo-x/actions/runs/42";

it("renders a failure dashboard for a secret that failed to create", async () => {
  const accountAActionsTarget = createTestProvisionRequestTarget("actions");

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResult],
  });

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResult, { type: "NO_ISSUER" }],
  ]);

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      secret,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "NO_TOKEN" }],
      ]),
    ],
  ]);

  const issue = renderFailureDashboard(
    runUrl,
    [secret],
    [tokenAuthResult],
    tokenCreationResults,
    provisionResults,
  );

  expect(issue.title).toBe(FAILURE_DASHBOARD_TITLE);
  await expect(issue.body).toMatchFileSnapshot(
    join(fixturesPath, "token-creation-failed.md"),
  );
});

it("renders a failure dashboard with multiple secrets and request errors", async () => {
  const accountAActionsTarget = createTestProvisionRequestTarget("actions");
  const accountBActionsTarget = createTestProvisionRequestTarget(
    "actions",
    "account-b",
  );

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
    have: { contents: "read" },
    maxWant: "read",
  });

  const targetResultA = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const targetResultB = createTestProvisionAuthTargetResult({
    target: accountBActionsTarget,
    tokenAuthResult,
  });

  const secretA = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
            "account-b": { actions: true },
          },
        },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResultA],
  });

  const secretB = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-b",
        github: {
          accounts: {
            "account-a": { actions: true },
            "account-b": { actions: true },
          },
        },
      }),
      name: "SECRET_B",
      to: [accountAActionsTarget, accountBActionsTarget],
    }),
    results: [targetResultA, targetResultB],
  });

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResult,
      {
        type: "CREATED",
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const requestError = new RequestError("boom", 500, {
    request: { method: "POST", url: "https://api.example.com/", headers: {} },
    response: {
      url: "https://api.example.com/",
      status: 500,
      headers: {},
      data: { message: "boom", documentation_url: "https://docs.example.com/" },
    },
  });

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      secretA,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
      ]),
    ],
    [
      secretB,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResultA, { type: "PROVISIONED" }],
        [targetResultB, { type: "REQUEST_ERROR", error: requestError }],
      ]),
    ],
  ]);

  const issue = renderFailureDashboard(
    runUrl,
    [secretA, secretB],
    [tokenAuthResult],
    tokenCreationResults,
    provisionResults,
  );

  expect(issue.title).toBe(FAILURE_DASHBOARD_TITLE);
  await expect(issue.body).toMatchFileSnapshot(
    join(fixturesPath, "multiple-secrets.md"),
  );
});

it("renders a config issue dashboard for root-level errors", async () => {
  const issue = renderConfigIssueDashboard(githubServerUrl, runUrl, {
    requester: { account: "account-x", repo: "repo-x" },
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    errors: [
      {
        instancePath: "",
        schemaPath: "#",
        keyword: "type",
        params: { type: "object" },
      },
    ],
  });

  expect(issue.title).toBe(CONFIG_ISSUE_DASHBOARD_TITLE);
  await expect(issue.body).toMatchFileSnapshot(
    join(fixturesPath, "config-issue-root.md"),
  );
});

it("skips the token creation section for a token not created this run", async () => {
  const accountAActionsTarget = createTestProvisionRequestTarget("actions");

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
    },
    have: { contents: "read" },
    maxWant: "read",
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResult],
  });

  const requestError = new RequestError("boom", 500, {
    request: { method: "POST", url: "https://api.example.com/", headers: {} },
    response: {
      url: "https://api.example.com/",
      status: 500,
      headers: {},
      data: { message: "boom", documentation_url: "https://docs.example.com/" },
    },
  });

  const provisionResults = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisionResult>
  >([
    [
      secret,
      new Map<ProvisionAuthTargetResult, ProvisionResult>([
        [targetResult, { type: "REQUEST_ERROR", error: requestError }],
      ]),
    ],
  ]);

  const issue = renderFailureDashboard(
    runUrl,
    [secret],
    [tokenAuthResult],
    new Map(),
    provisionResults,
  );

  expect(issue.title).toBe(FAILURE_DASHBOARD_TITLE);
  await expect(issue.body).toMatchFileSnapshot(
    join(fixturesPath, "token-creation-skipped.md"),
  );
});

it("omits the provision section for a secret missing from the provision results", async () => {
  const accountAActionsTarget = createTestProvisionRequestTarget("actions");

  const tokenAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      repos: "all",
      tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
    },
    have: { contents: "write" },
    maxWant: "write",
  });

  const targetResult = createTestProvisionAuthTargetResult({
    target: accountAActionsTarget,
    tokenAuthResult,
  });

  const secret = createTestProvisionAuthResult({
    request: createTestProvisionRequest({
      requester: { account: "account-x", repo: "repo-x" },
      tokenDec: tokenAuthResult.request.tokenDec,
      secretDec: createTestSecretDec({
        token: "account-a/repo-a.token-a",
        github: {
          accounts: {
            "account-a": { actions: true },
          },
        },
      }),
      to: [accountAActionsTarget],
    }),
    results: [targetResult],
  });

  const tokenCreationResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResult, { type: "NO_ISSUER" }],
  ]);

  const issue = renderFailureDashboard(
    runUrl,
    [secret],
    [tokenAuthResult],
    tokenCreationResults,
    new Map(),
  );

  expect(issue.title).toBe(FAILURE_DASHBOARD_TITLE);
  await expect(issue.body).toMatchFileSnapshot(
    join(fixturesPath, "provision-section-omitted.md"),
  );
});

it("renders a config issue dashboard", async () => {
  const issue = renderConfigIssueDashboard(githubServerUrl, runUrl, {
    requester: { account: "account-x", repo: "repo-x" },
    configPath: ".github/ghalactic/provision-github-tokens.yml",
    errors: [
      {
        instancePath: "/tokens/token-a",
        schemaPath: "#/properties/tokens/additionalProperties",
        keyword: "additionalProperties",
        params: {
          additionalProperty: "missing-roles",
        },
        message: "must NOT have additional properties",
      },
      {
        instancePath: "/provision/secrets/SECRET_A/github",
        schemaPath: "#/definitions/requesterGithub/additionalProperties",
        keyword: "additionalProperties",
        params: { additionalProperty: "repositories" },
        message: "must NOT have additional properties",
      },
      {
        instancePath: "/provision/secrets",
        schemaPath: "#/properties/provision/required",
        keyword: "required",
        params: { missingProperty: "secrets" },
        message: "must have required property 'secrets'",
      },
    ],
  });

  expect(issue.title).toBe(CONFIG_ISSUE_DASHBOARD_TITLE);
  await expect(issue.body).toMatchFileSnapshot(
    join(fixturesPath, "config-issue.md"),
  );
});
