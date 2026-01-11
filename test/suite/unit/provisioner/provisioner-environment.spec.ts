import { beforeEach, expect, it, vi, type Mock } from "vitest";
import { __reset as __resetCore } from "../../../../__mocks__/@actions/core.js";
import {
  __getEnvSecrets,
  __reset as __resetOctokit,
  __setApps,
  __setEnvironments,
  __setErrors,
  __setInstallations,
  __setRepoKeys,
  TestRequestError,
} from "../../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../../src/app-registry.js";
import {
  createEncryptSecret,
  type EncryptSecret,
} from "../../../../src/encrypt-secret.js";
import { createOctokitFactory } from "../../../../src/octokit.js";
import type { ProvisionRequestTarget } from "../../../../src/provision-request.js";
import { createFindProvisionerOctokit } from "../../../../src/provisioner-octokit.js";
import {
  createProvisioner,
  type Provisioner,
} from "../../../../src/provisioner.js";
import type { TokenCreationResult } from "../../../../src/token-factory.js";
import type { ProvisionAuthResult } from "../../../../src/type/provision-auth-result.js";
import type { TokenAuthResult } from "../../../../src/type/token-auth-result.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
  createTestRepoEnvironment,
} from "../../../github-api.js";
import { createTestKeyPair } from "../../../key.js";
import {
  createTestProvisionAuthTargetResultAllowed,
  provisionResultsToArray,
} from "../../../result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

const accountA = createTestInstallationAccount(
  "Organization",
  100,
  "account-a",
);
const repoA = createTestInstallationRepo(accountA, "repo-a");
const envA = createTestRepoEnvironment("env-a");
const appA = createTestApp(110, "app-a", "App A");
const appRegA: AppRegistration = {
  app: appA,
  issuer: { enabled: false, roles: [] },
  provisioner: { enabled: true },
};
const appAInstallationA = createTestInstallation(
  111,
  appA,
  accountA,
  "selected",
);
const appAInstallationRegA: InstallationRegistration = {
  installation: appAInstallationA,
  repos: [repoA],
};

const accountARepoAEnvAKey = await createTestKeyPair(
  "environment.account-a/repo-a/env-a",
);

const tokenDecA = createTestTokenDec({ permissions: { metadata: "read" } });

const secretDecA = createTestSecretDec({
  github: { accounts: { "account-a": { actions: true } } },
});

const tokenAuthResultA: TokenAuthResult = {
  type: "ALL_REPOS",
  have: { metadata: "read" },
  isAllowed: true,
  isMissingRole: false,
  isSufficient: true,
  maxWant: "read",
  request: {
    consumer: { account: "account-a" },
    repos: "all",
    tokenDec: tokenDecA,
  },
  rules: [],
};

const tokenCreationResultCreatedA: TokenCreationResult = {
  type: "CREATED",
  token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
};

const accountARepoAEnvATarget: ProvisionRequestTarget = {
  platform: "github",
  type: "environment",
  target: { account: "account-a", repo: "repo-a", environment: "env-a" },
};

let encryptSecret: Mock<EncryptSecret>;
let provisionSecrets: Provisioner;

beforeEach(async () => {
  __resetCore();
  __resetOctokit();

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);
  __setEnvironments([[repoA, [envA]]]);

  __setRepoKeys("account-a", "repo-a", {
    environments: { "env-a": accountARepoAEnvAKey },
  });

  const octokitFactory = createOctokitFactory();

  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    [
      {
        appId: appA.id,
        privateKey: appA.privateKey,
        issuer: appRegA.issuer,
        provisioner: appRegA.provisioner,
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
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountARepoAEnvATarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [
      allowedResult,
      [
        [
          allowedResult.results[0],
          { type: "REQUEST_ERROR", error: new TestRequestError(401) },
        ],
      ],
    ],
  ]);
});

it("handles unexpected errors when provisioning environment secrets", async () => {
  __setErrors("actions.createOrUpdateEnvironmentSecret", [
    new Error("<message>"),
  ]);

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountARepoAEnvATarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [
      allowedResult,
      [
        [
          allowedResult.results[0],
          { type: "ERROR", error: new Error("<message>") },
        ],
      ],
    ],
  ]);
});

it("can provision environment secrets", async () => {
  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultA, tokenCreationResultCreatedA],
  ]);

  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: secretDecA,
      name: "SECRET_A",
      to: [accountARepoAEnvATarget],
    },
    results: [
      createTestProvisionAuthTargetResultAllowed({
        target: accountARepoAEnvATarget,
        tokenAuthResult: tokenAuthResultA,
      }),
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    provisionResultsToArray(
      await provisionSecrets(tokenResults, [allowedResult]),
    ),
  ).toEqual([
    [allowedResult, [[allowedResult.results[0], { type: "PROVISIONED" }]]],
  ]);
  expect(__getEnvSecrets("account-a", "repo-a", "env-a")).toEqual({
    SECRET_A: "<token-a>",
  });
});
