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
  createTestInstallationRegistration,
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
  createTestTokenCreationCreatedResult,
  createTestTokenCreationFailedResult,
} from "../test/result.js";
import { createEncryptSecret } from "./encrypt-secret.js";
import { toMarkdown } from "./markdown.js";
import { createMarkdownProvisionExplainer } from "./provision-explainer/markdown.js";
import type { AccountSecretSelectedRepos } from "./provision-request.js";
import { createProvisioner } from "./provisioner.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
  const encryptSecret = vi.fn(createEncryptSecret());

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
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultNotAllowed, { type: "NOT_ALLOWED" }],
    [
      tokenAuthResultRequestError,
      createTestTokenCreationFailedResult([
        {
          type: "REQUEST_ERROR",
          issuer: createTestInstallationRegistration(),
          error: new TestRequestError(500),
        },
      ]),
    ],
    [
      tokenAuthResultError,
      createTestTokenCreationFailedResult([
        {
          type: "ERROR",
          issuer: createTestInstallationRegistration(),
          error: new Error("boom"),
        },
      ]),
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
  const encryptSecret = vi.fn(createEncryptSecret());
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ 403 - Forbidden
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ <message>
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ 401 - Unauthorized
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ <message>
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResultA = createTestTokenAuthResult();
  const tokenAuthResultB = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
    [
      tokenAuthResultB,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-b>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579

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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
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
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579

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
  const encryptSecret = vi.fn(createEncryptSecret());
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const selectedRepos: AccountSecretSelectedRepos = {
    patterns: ["repo-*"],
    repos: [
      {
        ref: { account: "account-a", repo: "repo-b" },
        id: 222,
        visibility: "private",
      },
      {
        ref: { account: "account-a", repo: "repo-a" },
        id: 111,
        visibility: "private",
      },
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
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 947161494 installation 2133206579

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
  const encryptSecret = vi.fn(createEncryptSecret());
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const selectedRepos: AccountSecretSelectedRepos = {
    patterns: ["repo-a", "repo-b"],
    repos: [
      {
        ref: { account: "account-a", repo: "repo-a" },
        id: 111,
        visibility: "private",
      },
      {
        ref: { account: "account-a", repo: "repo-b" },
        id: 222,
        visibility: "private",
      },
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
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by 2 repos:
          ❌ repo-a
          ❌ repo-b
        ❌ 403 - Forbidden
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResultA = createTestTokenAuthResult();
  const tokenAuthResultB = createTestTokenAuthResult();
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [
      tokenAuthResultA,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
    [tokenAuthResultB, { type: "NO_ISSUER" }],
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
    "::debug::Trying provisioner app 947161494 installation 2133206579

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

it("provisions identical declarations once", async () => {
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

  const appRegistry = createTestAppRegistry(createTestRepoRegistry(), {
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResultA = createTestTokenAuthResult();
  const tokenAuthResultB = createTestTokenAuthResult();
  const created = createTestTokenCreationCreatedResult({
    token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
  });
  const tokenResults = new Map([
    [tokenAuthResultA, created],
    [tokenAuthResultB, created],
  ]);

  const [[, targetResultsA], [, targetResultsB]] = await provisionSecrets(
    tokenResults,
    [
      {
        request: createTestProvisionRequest({
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
          to: [
            createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
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
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
      {
        request: createTestProvisionRequest({
          requester: { account: "account-a", repo: "repo-b" },
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
          to: [
            createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
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
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
    ],
  );

  const [targetResultA] = targetResultsA.values();
  const [targetResultB] = targetResultsB.values();

  expect(encryptSecret).toHaveBeenCalledTimes(1);
  expect(targetResultA).toBe(targetResultB);
  expect(targetResultA).toMatchObject({
    type: "PROVISIONED",
    failedAttempts: [],
  });
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: {
      SECRET_A: { value: "<token-a>", visibility: "private" },
    },
    agents: {},
    codespaces: {},
    dependabot: {},
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by private repos

    Secret #2:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-b:
      ✅ Provisioned to GitHub Actions secret in account-a
        ✅ Readable by private repos

    "
  `);
});

it("shares a failed write between identical declarations", async () => {
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
  const encryptSecret = vi.fn(createEncryptSecret());

  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenAuthResultA = createTestTokenAuthResult();
  const tokenAuthResultB = createTestTokenAuthResult();
  const created = createTestTokenCreationCreatedResult({
    token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
  });
  const tokenResults = new Map([
    [tokenAuthResultA, created],
    [tokenAuthResultB, created],
  ]);

  const [[, targetResultsA], [, targetResultsB]] = await provisionSecrets(
    tokenResults,
    [
      {
        request: createTestProvisionRequest({
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
          to: [
            createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
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
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
      {
        request: createTestProvisionRequest({
          requester: { account: "account-a", repo: "repo-b" },
          secretDec: createTestSecretDec({
            github: { accounts: { "account-a": { actions: "private" } } },
          }),
          to: [
            createTestAccountProvisionRequestTarget(
              "actions",
              "account-a",
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
        ],
        isMissingTargets: false,
        isAllowed: true,
      },
    ],
  );

  const [targetResultA] = targetResultsA.values();
  const [targetResultB] = targetResultsB.values();

  expect(encryptSecret).toHaveBeenCalledTimes(1);
  expect(targetResultA).toBe(targetResultB);
  expect(targetResultA).toMatchObject({
    type: "FAILED",
    attempts: [{ type: "REQUEST_ERROR", error: { status: 403 } }],
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Trying provisioner app 947161494 installation 2133206579

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    Secret #2:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-b:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    "
  `);
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
  const encryptSecret = vi.fn(createEncryptSecret());

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

it("keeps a provision target on the same provisioner across runs", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const [expected] = findProvisionerOctokit({ account: "account-a" });
  const [[, firstTargetResults]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);
  const [[, secondTargetResults]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);
  const [firstResult] = firstTargetResults.values();
  const [secondResult] = secondTargetResults.values();

  expect(firstResult).toMatchObject({
    type: "PROVISIONED",
    provisioner: expected.provisioner,
    failedAttempts: [],
  });
  expect(secondResult).toMatchObject({
    type: "PROVISIONED",
    provisioner: expected.provisioner,
    failedAttempts: [],
  });
});

it("falls over when a provisioner can't fetch the public key", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.getOrgPublicKey", [new TestRequestError(401)]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);
  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[authResult, targetResults]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(targetResults.get([...targetResults.keys()][0])).toMatchObject({
    type: "PROVISIONED",
    provisioner: candidates[1].provisioner,
    failedAttempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
    ],
  });
  expect(__getOrgSecrets("account-a")?.actions.SECRET_A?.value).toBe(
    "<token-a>",
  );

  const toMdast = createMarkdownProvisionExplainer();
  const markdown = toMarkdown(toMdast(authResult, targetResults));
  expect(markdown).toContain("401");
});

it("falls over when a provisioner can't write the secret", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.createOrUpdateOrgSecret", [new TestRequestError(403)]);
  // If the second provisioner fetched the key again, this error would fail it.
  __setErrors("actions.getOrgPublicKey", [
    undefined,
    new TestRequestError(500),
  ]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);
  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[, targetResults]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(targetResults.get([...targetResults.keys()][0])).toMatchObject({
    type: "PROVISIONED",
    provisioner: candidates[1].provisioner,
    failedAttempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
    ],
  });
  expect(__getOrgSecrets("account-a")?.actions.SECRET_A?.value).toBe(
    "<token-a>",
  );
});

it("fails after every provisioner fails", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403),
    new TestRequestError(500),
  ]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);
  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[authResult, targetResults]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(targetResults.get([...targetResults.keys()][0])).toMatchObject({
    type: "FAILED",
    attempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
      { type: "REQUEST_ERROR", provisioner: candidates[1].provisioner },
    ],
  });

  const toMdast = createMarkdownProvisionExplainer();
  const markdown = toMarkdown(toMdast(authResult, targetResults));
  expect(markdown).toContain("Attempt 1:");
  expect(markdown).toContain("Attempt 2:");
});

it("doesn't let the secret type affect provisioner affinity", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");
  const accountADependabotKey = await createTestKeyPair("dependabot.account-a");

  __setOrgKeys("account-a", {
    actions: accountAActionsKey,
    dependabot: accountADependabotKey,
  });

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const actionsTarget = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const dependabotTarget = createTestAccountProvisionRequestTarget(
    "dependabot",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);
  const [expected] = findProvisionerOctokit({ account: "account-a" });

  const [[, targetResults]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: {
            accounts: {
              "account-a": { actions: "private", dependabot: "private" },
            },
          },
        }),
        to: [actionsTarget, dependabotTarget],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: actionsTarget,
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: dependabotTarget,
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  for (const targetResult of targetResults.values()) {
    expect(targetResult).toMatchObject({
      type: "PROVISIONED",
      provisioner: expected.provisioner,
      failedAttempts: [],
    });
  }
});

it("explains a secret provisioned after falling back to another provisioner for encryption", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.getOrgPublicKey", [new TestRequestError(401)]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);
  const [targetResult] = targetResultsA.values();

  expect(targetResult).toMatchObject({
    type: "PROVISIONED",
    provisioner: candidates[1].provisioner,
    failedAttempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
    ],
  });

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 571481606 installation 1539634462

    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a:
        ❌ 401 - Unauthorized
    ::debug::      (no response data)
        ✅ Readable by private repos

    "
  `);

  const toMdast = createMarkdownProvisionExplainer();

  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "encryption-fallback/a.md"));
});

it("explains every provisioner attempt when encryption fails for all", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.getOrgPublicKey", [
    new TestRequestError(401),
    new TestRequestError(500),
  ]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);
  const [targetResult] = targetResultsA.values();

  expect(targetResult).toMatchObject({
    type: "FAILED",
    attempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
      { type: "REQUEST_ERROR", provisioner: candidates[1].provisioner },
    ],
  });

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 571481606 installation 1539634462

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ Attempt 1: 401 - Unauthorized
    ::debug::      (no response data)
        ❌ Attempt 2: 500 - Internal Server Error
    ::debug::      (no response data)

    "
  `);

  const toMdast = createMarkdownProvisionExplainer();

  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "encryption-all-failed/a.md"));
});

it("explains a secret provisioned after falling back to another provisioner for the write", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);
  const [targetResult] = targetResultsA.values();

  expect(targetResult).toMatchObject({
    type: "PROVISIONED",
    provisioner: candidates[1].provisioner,
    failedAttempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
    ],
  });

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 571481606 installation 1539634462

    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a:
        ❌ 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }
        ✅ Readable by private repos

    "
  `);

  const toMdast = createMarkdownProvisionExplainer();

  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "write-fallback/a.md"));
});

it("explains every provisioner attempt when the write fails for all", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]], [appB, [appBInstallationB]]] =
    createTestApps(
      ["App A", {}, [[accountA, "selected"]]],
      ["App B", {}, [[accountA, "selected"]]],
    );
  const accountAActionsKey = await createTestKeyPair("actions.account-a");

  __setOrgKeys("account-a", { actions: accountAActionsKey });
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403, { message: "Resource not accessible" }),
    new TestRequestError(500),
  ]);

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

  const { findProvisionerOctokit } = createTestOctokitFactory(appRegistry);
  const encryptSecret = createEncryptSecret();
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const target = createTestAccountProvisionRequestTarget(
    "actions",
    "account-a",
    "private",
  );
  const tokenAuthResult = createTestTokenAuthResult();
  const tokenResults = new Map([
    [
      tokenAuthResult,
      createTestTokenCreationCreatedResult({
        token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
      }),
    ],
  ]);

  const candidates = findProvisionerOctokit({ account: "account-a" });

  const [[resultA, targetResultsA]] = await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: "private" } } },
        }),
        to: [target],
      }),
      results: [
        createTestProvisionAuthTargetResult({ target, tokenAuthResult }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);
  const [targetResult] = targetResultsA.values();

  expect(targetResult).toMatchObject({
    type: "FAILED",
    attempts: [
      { type: "REQUEST_ERROR", provisioner: candidates[0].provisioner },
      { type: "REQUEST_ERROR", provisioner: candidates[1].provisioner },
    ],
  });

  expect(__getOutput()).toMatchInlineSnapshot(`
    "::debug::Trying provisioner app 947161494 installation 2133206579
    ::debug::Trying provisioner app 571481606 installation 1539634462

    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a:
        ❌ Would've been readable by private repos
        ❌ Attempt 1: 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }
        ❌ Attempt 2: 500 - Internal Server Error
    ::debug::      (no response data)

    "
  `);

  const toMdast = createMarkdownProvisionExplainer();

  await expect(
    toMarkdown(toMdast(resultA, targetResultsA)),
  ).toMatchFileSnapshot(join(fixturesPath, "write-all-failed/a.md"));
});
