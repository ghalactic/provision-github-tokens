import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  __getEnvSecrets,
  __reset as __resetOctokit,
  __setEnvironments,
  __setErrors,
  __setRepoKeys,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import { createTestSecretDec } from "../test/declaration.js";
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

it("handles GitHub API errors when provisioning environment secrets", async () => {
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
  const accountARepoAEnvAKey = await createTestKeyPair(
    "environment.account-a/repo-a/env-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setRepoKeys("account-a", "repo-a", {
    environments: { "env-a": accountARepoAEnvAKey },
  });

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
        to: [
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

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub environment env-a secret in account-a/repo-a: 401 - Unauthorized
    ::debug::      (no response data)

    "
  `);
});

it("handles unexpected errors when provisioning environment secrets", async () => {
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
  const accountARepoAEnvAKey = await createTestKeyPair(
    "environment.account-a/repo-a/env-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setRepoKeys("account-a", "repo-a", {
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateEnvironmentSecret", [error]);

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

    ❌ Secret SECRET_A wasn't provisioned for repo account-a/repo-a:
      ❌ Failed to provision to GitHub environment env-a secret in account-a/repo-a: <message>
    ::debug::      Error: <message>
    ::debug::          at provisioner.ts:1:1

    "
  `);
});

it("can provision environment secrets", async () => {
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
  const accountARepoAEnvAKey = await createTestKeyPair(
    "environment.account-a/repo-a/env-a",
  );

  __setEnvironments([[repoA, [envA]]]);
  __setRepoKeys("account-a", "repo-a", {
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

  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub environment env-a secret in account-a/repo-a

    "
  `);
});
