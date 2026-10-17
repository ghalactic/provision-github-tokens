import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getEnvSecrets,
  __getOrgSecrets,
  __getRepoSecrets,
  __reset as __resetOctokit,
  __setEnvironments,
  __setErrors,
  __setOrgKeys,
  __setRepoKeys,
  TestRequestError,
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
import { createTestKeyPair } from "../test/key.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import {
  createTestAccountProvisionRequestTarget,
  createTestEnvironmentProvisionRequestTarget,
  createTestProvisionRequest,
  createTestRepoProvisionRequestTarget,
} from "../test/provision-request.js";
import { createTestRepoRegistry } from "../test/repo-registry.js";
import {
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { createEncryptSecret } from "./encrypt-secret.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionExplainer } from "./provision-explainer/markdown.js";
import type { AccountSecretSelectedRepos } from "./provision-request.js";
import { createProvisioner } from "./provisioner.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const fixturesPath = join(import.meta.dirname, "testdata/provisioner/general");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("handles secrets with no targets to provision to", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: {},
        }),
        to: [],
      }),
      results: [],
      isMissingTargets: true,
      isAllowed: false,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ No targets to provision to

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "no-targets/a.md"));
});

it("doesn't provision secrets when provisioning isn't allowed", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          isAllowed: false,
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: false,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Not allowed to provision to GitHub Actions secret in account-a
        ❌ Would've been readable by private repos

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "not-allowed/a.md"));
});

it("doesn't provision secrets when the token wasn't created", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");
  const accountARepoAActionsKey = await createTestKeyPair(
    "actions.account-a/repo-a",
  );
  const accountARepoAEnvAKey = await createTestKeyPair(
    "environment.account-a/repo-a/env-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setRepoKeys("account-a", "repo-a", {
    actions: accountARepoAActionsKey,
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenAuthResultNotAllowed = {
    ...tokenAuthResult,
    request: {
      ...tokenAuthResult.request,
      consumer: { account: "consumer-not-allowed" },
    },
  };
  const tokenAuthResultRequestError = {
    ...tokenAuthResult,
    request: {
      ...tokenAuthResult.request,
      consumer: { account: "consumer-request-error" },
    },
  };
  const tokenAuthResultError = {
    ...tokenAuthResult,
    request: {
      ...tokenAuthResult.request,
      consumer: { account: "consumer-error" },
    },
  };
  const tokenResults = new Map([
    [tokenAuthResultNotAllowed, { type: "NOT_ALLOWED" as const }],
    [
      tokenAuthResultRequestError,
      {
        type: "REQUEST_ERROR" as const,
        error: new TestRequestError(500),
      },
    ],
    [
      tokenAuthResultError,
      { type: "ERROR" as const, error: new Error("boom") },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: {
            accounts: { "account-a": { actions: "private" } },
            repos: {
              "account-a/repo-a": { actions: true, environments: ["env-a"] },
            },
          },
        }),
        to: [
          createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          createTestRepoProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
            "private",
          ),
          createTestEnvironmentProvisionRequestTarget(
            "account-a",
            "repo-a",
            "env-a",
            "private",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult: tokenAuthResultNotAllowed,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestRepoProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
            "private",
          ),
          tokenAuthResult: tokenAuthResultRequestError,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestEnvironmentProvisionRequestTarget(
            "account-a",
            "repo-a",
            "env-a",
            "private",
          ),
          tokenAuthResult: tokenAuthResultError,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Token wasn't created for GitHub Actions secret in account-a
        ❌ Would've been readable by private repos
      ❌ Token wasn't created for GitHub Actions secret in account-a/repo-a
      ❌ Token wasn't created for GitHub environment env-a secret in account-a/repo-a

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "no-token/a.md"));
});

it("doesn't provision secrets when no suitable provisioners are found", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-x": { actions: "private" } } },
        }),
        to: [
          createTestAccountProvisionRequestTarget(
            "actions",
            "account-x",
            "private",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-x",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ No suitable provisioner for GitHub Actions secret in account-x
        ❌ Would've been readable by private repos

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "no-provisioner/a.md"));
});

it("doesn't provision secrets when target provisioning fails with a GitHub API error", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 403 - Forbidden
        ❌ Would've been readable by private repos
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "request-error/a.md"));
});

it("doesn't provision secrets when target provisioning fails with an unexpected error", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateOrgSecret", [error]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
        ❌ Would've been readable by private repos
    ::debug::      Error: <message>
    ::debug::          at provisioner.ts:1:1

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "unexpected-error/a.md"));
});

it("doesn't provision secrets when encryption fails with a GitHub API error", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", {});

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 401 - Unauthorized
        ❌ Would've been readable by private repos
    ::debug::      (no response data)

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "encryption-request-error/a.md"));
});

it("doesn't provision secrets when encryption fails with an unexpected error", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at encrypt.ts:1:1";
  __setErrors("actions.getOrgPublicKey", [error]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
        ❌ Would've been readable by private repos
    ::debug::      Error: <message>
    ::debug::          at encrypt.ts:1:1

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "encryption-unexpected-error/a.md"));
});

it("can provision multiple secrets of the same type", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");
  const accountARepoAActionsKey = await createTestKeyPair(
    "actions.account-a/repo-a",
  );
  const accountARepoAEnvAKey = await createTestKeyPair(
    "environment.account-a/repo-a/env-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setRepoKeys("account-a", "repo-a", {
    actions: accountARepoAActionsKey,
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResultA = createTestTokenAuthResult();
  const tokenAuthResultB = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResultA,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
    [
      tokenAuthResultB,
      {
        type: "CREATED" as const,
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA], [resultB, targetResultsB]] =
    await provisionSecrets(tokenResults, [
      {
        request: createTestProvisionRequest({
          secretDec: createTestSecretDec({
            github: {
              accounts: { "account-a": { actions: "private" } },
              repos: {
                "account-a/repo-a": { actions: true, environments: ["env-a"] },
              },
            },
          }),
          to: [
            createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            createTestRepoProvisionRequestTarget(
              "actions",
              "account-a",
              "repo-a",
              "private",
            ),
            createTestEnvironmentProvisionRequestTarget(
              "account-a",
              "repo-a",
              "env-a",
              "private",
            ),
          ],
        }),
        results: [
          createTestProvisionAuthTargetResult({
            target: createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultA,
          }),
          createTestProvisionAuthTargetResult({
            target: createTestRepoProvisionRequestTarget(
              "actions",
              "account-a",
              "repo-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultA,
          }),
          createTestProvisionAuthTargetResult({
            target: createTestEnvironmentProvisionRequestTarget(
              "account-a",
              "repo-a",
              "env-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultA,
          }),
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
      {
        request: createTestProvisionRequest({
          tokenDec: createTestTokenDec({ permissions: { contents: "write" } }),
          secretDec: createTestSecretDec({
            github: {
              accounts: { "account-a": { actions: "private" } },
              repos: {
                "account-a/repo-a": { actions: true, environments: ["env-a"] },
              },
            },
          }),
          name: "SECRET_B",
          to: [
            createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            createTestRepoProvisionRequestTarget(
              "actions",
              "account-a",
              "repo-a",
              "private",
            ),
            createTestEnvironmentProvisionRequestTarget(
              "account-a",
              "repo-a",
              "env-a",
              "private",
            ),
          ],
        }),
        results: [
          createTestProvisionAuthTargetResult({
            target: createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultB,
          }),
          createTestProvisionAuthTargetResult({
            target: createTestRepoProvisionRequestTarget(
              "actions",
              "account-a",
              "repo-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultB,
          }),
          createTestProvisionAuthTargetResult({
            target: createTestEnvironmentProvisionRequestTarget(
              "account-a",
              "repo-a",
              "env-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultB,
          }),
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
    ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by private repos
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    Secret #2:

    ✅ Secret SECRET_B was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by private repos
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: {
      SECRET_A: { value: "<token-a>", visibility: "private" },
      SECRET_B: { value: "<token-b>", visibility: "private" },
    },
    agents: {},
    codespaces: {},
    dependabot: {},
  });
  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>", SECRET_B: "<token-b>" },
    agents: {},
    codespaces: {},
    dependabot: {},
  });
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
    SECRET_B: "<token-b>",
  });
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-secrets/a.md"));
  await expect(
    toMarkdown(toMdast(resultB, targetResultsB)),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-secrets/b.md"));
});

it("can provision a secret to multiple targets", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");
  const accountACodespacesKey = await createTestKeyPair("codespaces.account-a");
  const accountADependabotKey = await createTestKeyPair("dependabot.account-a");
  const accountARepoAActionsKey = await createTestKeyPair(
    "actions.account-a/repo-a",
  );
  const accountARepoACodespacesKey = await createTestKeyPair(
    "codespaces.account-a/repo-a",
  );
  const accountARepoADependabotKey = await createTestKeyPair(
    "dependabot.account-a/repo-a",
  );
  const accountARepoAEnvAKey = await createTestKeyPair(
    "environment.account-a/repo-a/env-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", {
    actions: accountAActionsKey,
    codespaces: accountACodespacesKey,
    dependabot: accountADependabotKey,
  });
  __setRepoKeys("account-a", "repo-a", {
    actions: accountARepoAActionsKey,
    codespaces: accountARepoACodespacesKey,
    dependabot: accountARepoADependabotKey,
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: {
            accounts: {
              "account-a": {
                actions: "private",
                codespaces: "private",
                dependabot: "private",
              },
            },
            repos: {
              "account-a/repo-a": {
                actions: true,
                codespaces: true,
                dependabot: true,
                environments: ["env-a"],
              },
            },
          },
        }),
        to: [
          createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          createTestAccountProvisionRequestTarget(
            "codespaces",
            "account-a",
            "private",
          ),
          createTestAccountProvisionRequestTarget(
            "dependabot",
            "account-a",
            "private",
          ),
          createTestRepoProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
            "private",
          ),
          createTestRepoProvisionRequestTarget(
            "codespaces",
            "account-a",
            "repo-a",
            "private",
          ),
          createTestRepoProvisionRequestTarget(
            "dependabot",
            "account-a",
            "repo-a",
            "private",
          ),
          createTestEnvironmentProvisionRequestTarget(
            "account-a",
            "repo-a",
            "env-a",
            "private",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "actions",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "codespaces",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestAccountProvisionRequestTarget(
            "dependabot",
            "account-a",
            "private",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestRepoProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
            "private",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestRepoProvisionRequestTarget(
            "codespaces",
            "account-a",
            "repo-a",
            "private",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestRepoProvisionRequestTarget(
            "dependabot",
            "account-a",
            "repo-a",
            "private",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestEnvironmentProvisionRequestTarget(
            "account-a",
            "repo-a",
            "env-a",
            "private",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by private repos
      ✅ Provisioned to GitHub Codespaces secret in account-a
        ✅ Readable by private repos
      ✅ Provisioned to Dependabot secret in account-a
        ✅ Readable by private repos
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub Codespaces secret in account-a/repo-a
      ✅ Provisioned to Dependabot secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: { SECRET_A: { value: "<token-a>", visibility: "private" } },
    agents: {},
    codespaces: { SECRET_A: { value: "<token-a>", visibility: "private" } },
    dependabot: { SECRET_A: { value: "<token-a>", visibility: "private" } },
  });
  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    agents: {},
    codespaces: { SECRET_A: "<token-a>" },
    dependabot: { SECRET_A: "<token-a>" },
  });
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
  });
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-targets/a.md"));
});

it("renders the visibility of provisioned account secrets", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);

  __setOrgKeys("account-a", {
    actions: await createTestKeyPair("actions.account-a"),
    agents: await createTestKeyPair("agents.account-a"),
    codespaces: await createTestKeyPair("codespaces.account-a"),
    dependabot: await createTestKeyPair("dependabot.account-a"),
  });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const selectedRepos: AccountSecretSelectedRepos = {
    patterns: ["repo-*"],
    repos: [
      { ref: { account: "account-a", repo: "repo-b" }, id: 222 },
      { ref: { account: "account-a", repo: "repo-a" }, id: 111 },
    ],
  };

  const targets = [
    createTestAccountProvisionRequestTarget("actions", "account-a", "all"),
    createTestAccountProvisionRequestTarget(
      "agents",
      "account-a",
      selectedRepos,
    ),
    createTestAccountProvisionRequestTarget("codespaces", "account-a", {
      patterns: [],
      repos: [],
    }),
    createTestAccountProvisionRequestTarget(
      "dependabot",
      "account-a",
      "private",
    ),
  ];

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({ to: targets }),
      results: targets.map((target) =>
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ),
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by all repos
      ✅ Provisioned to GitHub Agents secret in account-a
        ✅ Readable by 2 repos:
          ✅ repo-a
          ✅ repo-b
      ✅ Provisioned to GitHub Codespaces secret in account-a
        ✅ Readable by no repos
      ✅ Provisioned to Dependabot secret in account-a
        ✅ Readable by private repos

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "account-visibility/a.md"));
});

it("renders the visibility of a failed account secret", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
  ]);

  const selectedRepos: AccountSecretSelectedRepos = {
    patterns: ["repo-a", "repo-b"],
    repos: [
      { ref: { account: "account-a", repo: "repo-a" }, id: 111 },
      { ref: { account: "account-a", repo: "repo-b" }, id: 222 },
    ],
  };
  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    selectedRepos,
  );

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({ to: [target] }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 403 - Forbidden
        ❌ Would've been readable by 2 repos:
          ❌ repo-a
          ❌ repo-b
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "account-visibility-error/a.md"));
});

it("doesn't stop provisioning when some targets fail", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResultA = createTestTokenAuthResult();
  const tokenAuthResultB = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResultA,
      {
        type: "CREATED" as const,
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      },
    ],
    [tokenAuthResultB, { type: "NO_ISSUER" as const }],
  ]);

  const [[resultA, targetResultsA], [resultB, targetResultsB]] =
    await provisionSecrets(tokenResults, [
      {
        request: createTestProvisionRequest({
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
        }),
        results: [
          createTestProvisionAuthTargetResult({
            isAllowed: false,
            target: createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultA,
          }),
        ],
        isMissingTargets: false,
        isAllowed: false,
      },
      {
        request: createTestProvisionRequest({
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
        }),
        results: [
          createTestProvisionAuthTargetResult({
            target: createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultB,
          }),
          createTestProvisionAuthTargetResult({
            target: createTestAccountProvisionRequestTarget(
              "actions",
              "account-x",
              "private",
            ),
            tokenAuthResult: tokenAuthResultA,
          }),
          createTestProvisionAuthTargetResult({
            target: createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
              "private",
            ),
            tokenAuthResult: tokenAuthResultA,
          }),
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
    ]);

  const toMdast = createMarkdownProvisionExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Not allowed to provision to GitHub Actions secret in account-a
        ❌ Would've been readable by private repos

    Secret #2:

    ❌ Secret SECRET_A was partially provisioned for repo account-a/repo-a:
      ❌ Token wasn't created for GitHub Actions secret in account-a
        ❌ Would've been readable by private repos
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by private repos
      ❌ No suitable provisioner for GitHub Actions secret in account-x
        ❌ Would've been readable by private repos

    "
  `);
  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "partial-failure/a.md"));
  await expect(
    toMarkdown(toMdast(resultB, targetResultsB)),
  ).toMatchFileSnapshot(join(fixturesPath, "partial-failure/b.md"));
});

it("warns when no auth results are provided", async () => {
  const [[accountA, [repoA], [[envA]]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    [["repo-a", ["env-a"]]],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    {},
    [[accountA, "selected"]],
  ]);
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setEnvironments([[repoA, [envA]]]);
  __setOrgKeys("account-a", { actions: accountAActionsKey });

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const results = await provisionSecrets(new Map(), []);

  expect(results.size).toBe(0);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    ::warning::⚠️ No secrets were provisioned

    "
  `);
});
