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
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import {
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { createEncryptSecret } from "./encrypt-secret.js";
import { createProvisioner } from "./provisioner.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
        to: [],
      }),
      results: [],
      isMissingTargets: true,
      isAllowed: false,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ No targets to provision to

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          isAllowed: false,
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: false,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Not allowed to provision to GitHub Actions secret in account-a

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
        to: [
          createTestProvisionRequestTarget("actions"),
          createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
          createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult: tokenAuthResultNotAllowed,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult: tokenAuthResultRequestError,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
          tokenAuthResult: tokenAuthResultError,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Token wasn't created for GitHub Actions secret in account-a
      ❌ Token wasn't created for GitHub Actions secret in account-a/repo-a
      ❌ Token wasn't created for GitHub environment env-a secret in account-a/repo-a

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
        to: [createTestProvisionRequestTarget("actions", "account-x")],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions", "account-x"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ No suitable provisioner for GitHub Actions secret in account-x

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    "
  `);
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
  error.stack = "Error: <message>\\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateOrgSecret", [error]);

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
    ::debug::      Error: <message>\\n    at provisioner.ts:1:1

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: 401 - Unauthorized
    ::debug::      (no response data)

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
    ::debug::      Error: <message>
    ::debug::          at encrypt.ts:1:1

    "
  `);
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
        to: [
          createTestProvisionRequestTarget("actions"),
          createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
          createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult: tokenAuthResultA,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult: tokenAuthResultA,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
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
          github: { repos: { "account-a/repo-a": { codespaces: true } } },
        }),
        name: "SECRET_B",
        to: [
          createTestProvisionRequestTarget("actions"),
          createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
          createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult: tokenAuthResultB,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult: tokenAuthResultB,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
          tokenAuthResult: tokenAuthResultB,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    Secret #2:

    ✅ Secret SECRET_B was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: { SECRET_A: "<token-a>", SECRET_B: "<token-b>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>", SECRET_B: "<token-b>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
    SECRET_B: "<token-b>",
  });
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
        to: [
          createTestProvisionRequestTarget("actions"),
          createTestProvisionRequestTarget("codespaces"),
          createTestProvisionRequestTarget("dependabot"),
          createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
          createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
          createTestProvisionRequestTarget("dependabot", "account-a", "repo-a"),
          createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
        ],
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("codespaces"),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("dependabot"),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "actions",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "codespaces",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "dependabot",
            "account-a",
            "repo-a",
          ),
          tokenAuthResult,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget(
            "environment",
            "account-a",
            "repo-a",
            "env-a",
          ),
          tokenAuthResult,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Codespaces secret in account-a
      ✅ Provisioned to Dependabot secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a
      ✅ Provisioned to GitHub Codespaces secret in account-a/repo-a
      ✅ Provisioned to Dependabot secret in account-a/repo-a
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
  expect(__getOrgSecrets("account-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    codespaces: { SECRET_A: "<token-a>" },
    dependabot: { SECRET_A: "<token-a>" },
  });
  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    codespaces: { SECRET_A: "<token-a>" },
    dependabot: { SECRET_A: "<token-a>" },
  });
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
  });
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

  const appRegistry = createTestAppRegistry({
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

  await provisionSecrets(tokenResults, [
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          isAllowed: false,
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult: tokenAuthResultA,
        }),
      ],
      isMissingTargets: false,
      isAllowed: false,
    },
    {
      request: createTestProvisionRequest({
        secretDec: createTestSecretDec({
          github: { accounts: { "account-a": { actions: true } } },
        }),
      }),
      results: [
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult: tokenAuthResultB,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions", "account-x"),
          tokenAuthResult: tokenAuthResultA,
        }),
        createTestProvisionAuthTargetResult({
          target: createTestProvisionRequestTarget("actions"),
          tokenAuthResult: tokenAuthResultA,
        }),
      ],
      isMissingTargets: false,
      isAllowed: true,
    },
  ]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Not allowed to provision to GitHub Actions secret in account-a

    Secret #2:

    ❌ Secret SECRET_A was partially provisioned for repo account-a/repo-a:
      ❌ Token wasn't created for GitHub Actions secret in account-a
      ✅ Provisioned to GitHub Actions secret in account-a
      ❌ No suitable provisioner for GitHub Actions secret in account-x

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

  const appRegistry = createTestAppRegistry({
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
