import { beforeEach, expect, it, vi, type Mock } from "vitest";
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
  createTestRepoEnvironment,
} from "../test/github-api.js";
import { createTestKeyPair } from "../test/key.js";
import {
  createTestProvisionRequest,
  createTestProvisionRequestTarget,
} from "../test/provision-request.js";
import {
  createTestProvisionAuthTargetResult,
  createTestTokenAuthResult,
} from "../test/result.js";
import { createEncryptSecret, type EncryptSecret } from "./encrypt-secret.js";
import { createOctokitFactory } from "./octokit.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import { createFindProvisionerOctokit } from "./provisioner-octokit.js";
import { createProvisioner, type Provisioner } from "./provisioner.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const [[accountA, [repoA]]] = createTestInstallationAccounts([
  "Organization",
  100,
  "account-a",
  ["repo-a"],
]);
const envA = createTestRepoEnvironment("env-a");
const [[appA, [appAInstallationA]]] = createTestApps([
  110,
  "app-a",
  "App A",
  {},
  [[111, accountA, "selected"]],
]);

const accountARepoAEnvAKey = await createTestKeyPair(
  "environment.account-a/repo-a/env-a",
);

const secretDecA = createTestSecretDec({
  github: { accounts: { "account-a": { actions: true } } },
});

const tokenAuthResultA = createTestTokenAuthResult();

const tokenCreationResultCreatedA: TokenCreationResult = {
  type: "CREATED",
  token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
};

const accountARepoAEnvATarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget(
    "environment",
    "account-a",
    "repo-a",
    "env-a",
  );

let encryptSecret: Mock<EncryptSecret>;
let provisionSecrets: Provisioner;

beforeEach(() => {
  __resetCore();
  __resetOctokit();

  __setEnvironments([[repoA, [envA]]]);

  __setRepoKeys("account-a", "repo-a", {
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const octokitFactory = createOctokitFactory();

  const appRegistry = createTestAppRegistry({
    app: appA,
    provisioner: true,
    installations: [[appAInstallationA, [repoA]]],
  });

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

  encryptSecret = vi.fn(createEncryptSecret(findProvisionerOctokit));

  provisionSecrets = createProvisioner(findProvisionerOctokit, encryptSecret);
});

it("handles GitHub API errors when provisioning environment secrets", async () => {
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      secretDec: secretDecA,
      to: [accountARepoAEnvATarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [allowedResult]);

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
  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateEnvironmentSecret", [error]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      secretDec: secretDecA,
      to: [accountARepoAEnvATarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [allowedResult]);

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
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      secretDec: secretDecA,
      to: [accountARepoAEnvATarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [allowedResult]);

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
