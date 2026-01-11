import { beforeEach, expect, it, vi } from "vitest";
import { __reset as __resetCore } from "../../../__mocks__/@actions/core.js";
import {
  __addInstallationToken,
  __reset as __resetOctokit,
  __setApps,
  __setErrors,
  __setInstallations,
  TestRequestError,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createFindIssuerOctokit } from "../../../src/issuer-octokit.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import { createTokenFactory } from "../../../src/token-factory.js";
import type { AppInput } from "../../../src/type/input.js";
import type { TokenAuthResult } from "../../../src/type/token-auth-result.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../../github-api.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("creates tokens based on token auth results", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", { metadata: "read" });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA],
  };
  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);

  const appsInput: AppInput[] = [
    {
      appId: 110,
      privateKey: "<private key A>",
      issuer: { enabled: true, roles: [] },
      provisioner: { enabled: false },
    },
  ];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  __setApps([appA]);
  __setInstallations([[appAInstallationA, [repoA]]]);
  __addInstallationToken(111, "all", { metadata: "read" });
  __setErrors("apps.createInstallationAccessToken", [
    undefined,
    undefined,
    new Error("<message>"),
  ]);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const notAllowedResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
      },
      repos: "all",
    },
    maxWant: "write",
    have: { metadata: "read" },
    isSufficient: false,
    isMissingRole: false,
    isAllowed: false,
    rules: [],
  };
  const noIssuerResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-b",
        repos: "all",
        permissions: { metadata: "read" },
      },
      repos: "all",
    },
    maxWant: "read",
    have: { metadata: "read" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };
  const createdResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
      },
      repos: "all",
    },
    maxWant: "read",
    have: { metadata: "read" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };
  const unauthorizedResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: ["repo-a"],
        permissions: { metadata: "read" },
      },
      repos: ["repo-a"],
    },
    maxWant: "read",
    have: { metadata: "read" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };
  const errorResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { metadata: "read" },
      },
      repos: "all",
    },
    maxWant: "read",
    have: { metadata: "read" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };

  expect(
    Array.from(
      (
        await createTokens([
          notAllowedResult,
          noIssuerResult,
          createdResult,
          unauthorizedResult,
          errorResult,
        ])
      ).entries(),
    ),
  ).toEqual([
    [notAllowedResult, { type: "NOT_ALLOWED" }],
    [noIssuerResult, { type: "NO_ISSUER" }],
    [
      createdResult,
      { type: "CREATED", token: '<token 111.all.{"metadata":"read"}>' },
    ],
    [
      unauthorizedResult,
      { type: "REQUEST_ERROR", error: new TestRequestError(401) },
    ],
    [errorResult, { type: "ERROR", error: new Error("<message>") }],
  ]);
});

it("returns empty map when no token auth results are given", async () => {
  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  const appsInput: AppInput[] = [];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );
  const createTokens = createTokenFactory(findIssuerOctokit);

  expect(Array.from((await createTokens([])).entries())).toEqual([]);
});
