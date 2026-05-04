import { beforeEach, expect, it, vi, type Mock } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
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
import { createTestSecretDec } from "../test/declaration.js";
import {
  createTestApps,
  createTestInstallationAccounts,
  createTestRepoEnvironments,
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
const [envA] = createTestRepoEnvironments("env-a");
const [[appA, [appAInstallationA]]] = createTestApps([
  "App A",
  {},
  [[accountA, "selected"]],
]);

const accountAActionsKey = await createTestKeyPair("actions.account-a");
const accountARepoAActionsKey = await createTestKeyPair(
  "actions.account-a/repo-a",
);

const secretDecA = createTestSecretDec({
  github: { accounts: { "account-a": { actions: true } } },
});

const tokenAuthResultA = createTestTokenAuthResult();

const tokenCreationResultCreatedA: TokenCreationResult = {
  type: "CREATED",
  token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
};

const accountAActionsTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("actions");
const accountARepoAActionsTarget: ProvisionRequestTarget =
  createTestProvisionRequestTarget("actions", "account-a", "repo-a");

let encryptSecret: Mock<EncryptSecret>;
let provisionSecrets: Provisioner;

beforeEach(() => {
  __resetCore();
  __resetOctokit();

  __setEnvironments([[repoA, [envA]]]);

  __setOrgKeys("account-a", {
    actions: accountAActionsKey,
  });
  __setRepoKeys("account-a", "repo-a", {
    actions: accountARepoAActionsKey,
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

it("handles GitHub API errors when provisioning org-level Actions secrets", async () => {
  __setErrors("actions.createOrUpdateOrgSecret", [
    new TestRequestError(403, { message: "Resource not accessible" }),
  ]);
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({ secretDec: secretDecA }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
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
      ❌ Failed to provision to GitHub Actions secret in account-a: 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }

    "
  `);
});

it("handles unexpected errors when provisioning org-level Actions secrets", async () => {
  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateOrgSecret", [error]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({ secretDec: secretDecA }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
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
      ❌ Failed to provision to GitHub Actions secret in account-a: <message>
    ::debug::      Error: <message>
    ::debug::          at provisioner.ts:1:1

    "
  `);
});

it("can provision org-level Actions secrets", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({ secretDec: secretDecA }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getOrgSecrets("account-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a

    "
  `);
});

it("handles GitHub API errors when provisioning repo-level Actions secrets", async () => {
  encryptSecret.mockResolvedValue(["XXXX", "XXXX"]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      secretDec: secretDecA,
      to: [accountARepoAActionsTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
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
      ❌ Failed to provision to GitHub Actions secret in account-a/repo-a: 401 - Unauthorized
    ::debug::      (no response data)

    "
  `);
});

it("handles unexpected errors when provisioning repo-level Actions secrets", async () => {
  const error = new Error("<message>");
  error.stack = "Error: <message>\n    at provisioner.ts:1:1";
  __setErrors("actions.createOrUpdateRepoSecret", [error]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      secretDec: secretDecA,
      to: [accountARepoAActionsTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
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
      ❌ Failed to provision to GitHub Actions secret in account-a/repo-a: <message>
    ::debug::      Error: <message>
    ::debug::          at provisioner.ts:1:1

    "
  `);
});

it("can provision repo-level Actions secrets", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: createTestProvisionRequest({
      secretDec: secretDecA,
      to: [accountARepoAActionsTarget],
    }),
    results: [
      createTestProvisionAuthTargetResult({
        target: accountARepoAActionsTarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  await provisionSecrets(tokenResults, [allowedResult]);

  expect(__getRepoSecrets("account-a", "repo-a")).toEqual({
    actions: { SECRET_A: "<token-a>" },
    codespaces: {},
    dependabot: {},
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Secret #1:

    ✅ Secret SECRET_A was provisioned for repo account-a/repo-a:
      ✅ Provisioned to GitHub Actions secret in account-a/repo-a

    "
  `);
});
