import { beforeEach, expect, it, vi } from "vitest";
import { __reset as __resetCore } from "../../../__mocks__/@actions/core.js";
import {
  __reset as __resetOctokit,
  __setApps,
  __setEnvironments,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createEncryptSecret } from "../../../src/encrypt-secret.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import type { ProvisionRequestTarget } from "../../../src/provision-request.js";
import { createFindProvisionerOctokit } from "../../../src/provisioner-octokit.js";
import { createProvisioner } from "../../../src/provisioner.js";
import type { TokenCreationResult } from "../../../src/token-factory.js";
import type { ProvisionAuthResult } from "../../../src/type/provision-auth-result.js";
import type { TokenAuthResult } from "../../../src/type/token-auth-result.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
  createTestRepoEnvironment,
} from "../../github-api.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("provisions secrets based on provision auth results", async () => {
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

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);
  __setEnvironments([[repoA, [envA]]]);

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

  const encryptSecret = createEncryptSecret(findProvisionerOctokit);
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  const tokenDecA = createTestTokenDec({ permissions: { metadata: "read" } });

  const tokenAuthResultCreated: TokenAuthResult = {
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
  const tokenCreationResultCreated: TokenCreationResult = {
    type: "CREATED",
    token: { token: "<token-a>", expires_at: "2001-02-03T04:05:06Z" },
  };

  const tokenAuthResultNotCreated: TokenAuthResult = {
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
  const tokenCreationResultNotCreated: TokenCreationResult = {
    type: "NO_ISSUER",
  };

  const tokenResults = new Map<TokenAuthResult, TokenCreationResult>([
    [tokenAuthResultCreated, tokenCreationResultCreated],
    [tokenAuthResultNotCreated, tokenCreationResultNotCreated],
  ]);

  const orgAActionsTarget: ProvisionRequestTarget = {
    platform: "github",
    type: "actions",
    target: { account: "account-a" },
  };

  const notAllowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        github: { accounts: { "account-a": { actions: true } } },
      }),
      name: "SECRET_A",
      to: [orgAActionsTarget],
    },
    results: [
      {
        target: orgAActionsTarget,
        rules: [],
        have: "deny",
        tokenAuthResult: tokenAuthResultCreated,
        isTokenAllowed: true,
        isProvisionAllowed: false,
        isAllowed: false,
      },
    ],
    isMissingTargets: false,
    isAllowed: false,
  };
  const allowedResult: ProvisionAuthResult = {
    request: {
      requester: { account: "account-a", repo: "repo-a" },
      tokenDec: tokenDecA,
      tokenDecIsRegistered: true,
      secretDec: createTestSecretDec({
        github: { accounts: { "account-a": { actions: true } } },
      }),
      name: "SECRET_A",
      to: [orgAActionsTarget],
    },
    results: [
      {
        target: orgAActionsTarget,
        rules: [],
        have: "deny",
        tokenAuthResult: tokenAuthResultNotCreated,
        isTokenAllowed: true,
        isProvisionAllowed: true,
        isAllowed: true,
      },
    ],
    isMissingTargets: false,
    isAllowed: true,
  };

  expect(
    await provisionSecrets(tokenResults, [notAllowedResult, allowedResult]),
  ).toEqual(
    new Map([
      [
        notAllowedResult,
        new Map([[notAllowedResult.results[0], { type: "NOT_ALLOWED" }]]),
      ],
      [
        allowedResult,
        new Map([[allowedResult.results[0], { type: "NO_TOKEN" }]]),
      ],
    ]),
  );
});
