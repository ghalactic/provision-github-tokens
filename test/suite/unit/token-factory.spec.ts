import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../../../__mocks__/@actions/core.js";
import {
  TestRequestError,
  __addInstallationToken,
  __reset as __resetOctokit,
  __setApps,
  __setErrors,
  __setInstallations,
} from "../../../__mocks__/@octokit/action.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "../../../src/app-registry.js";
import { createFindIssuerOctokit } from "../../../src/issuer-octokit.js";
import { createOctokitFactory } from "../../../src/octokit.js";
import { createTextTokenCreationExplainer } from "../../../src/token-creation-explainer/text.js";
import {
  createTokenFactory,
  type TokenCreationResult,
} from "../../../src/token-factory.js";
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
  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [
    undefined,
    new TestRequestError(401, { message: "Bad credentials" }),
    unexpectedError,
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
    type: "SELECTED_REPOS",
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
    results: {
      "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
    },
    isMatched: true,
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
  };
  const errorResult: TokenAuthResult = {
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: ["repo-a", "repo-b"],
        permissions: { metadata: "read" },
      },
      repos: ["repo-a", "repo-b"],
    },
    maxWant: "read",
    results: {
      "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
      "repo-b": { rules: [], have: { metadata: "read" }, isSufficient: true },
    },
    isMatched: true,
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
  };

  const results = await createTokens([
    notAllowedResult,
    noIssuerResult,
    createdResult,
    unauthorizedResult,
    errorResult,
  ]);
  expect(results.get(createdResult)).toMatchObject({
    type: "CREATED",
    // FIXME: The Octokit mock returns a plain string instead of an
    // InstallationToken object. Fix the mock to return { token, expires_at }.
    token: expect.any(String) as unknown as string,
  });
  expect(results.get(unauthorizedResult)).toMatchObject({
    type: "REQUEST_ERROR",
  });
  expect(results.get(errorResult)).toMatchObject({
    type: "ERROR",
  });
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Refused to create read-only token with access to all repos in account-a:
      ❌ Token not allowed
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read

    Token #2:

    ❌ Failed to create read-only token with access to all repos in account-b:
      ❌ No suitable issuer
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-b
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read

    Token #3:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #4:

    ❌ Failed to create read-only token with access to 1 repo in account-a:
      ❌ 401 - Unauthorized
    ::debug::      {
    ::debug::        "message": "Bad credentials"
    ::debug::      }
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to 1 repo in account-a:
        ℹ️ account-a/repo-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read

    Token #5:

    ❌ Failed to create read-only token with access to 2 repos in account-a:
      ❌ <message>
    ::debug::      Error: <message>
    ::debug::          at token-factory.ts:1:1
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to 2 repos in account-a:
        ℹ️ account-a/repo-a
        ℹ️ account-a/repo-b
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read
    "
  `);
});

it("deduplicates token creation for identical token shapes", async () => {
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

  const createTokens = createTokenFactory(findIssuerOctokit);

  const consumerAResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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
  const consumerBResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
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

  await createTokens([consumerAResult, consumerBResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ✅ Same token as #1
    "
  `);
});

it("isolates tokens by role even when other token shape fields match", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", { contents: "write" });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: ["role-a", "role-b"] },
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
      issuer: { enabled: true, roles: ["role-a", "role-b"] },
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
  __addInstallationToken(111, "all", { contents: "write" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const roleAResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    },
    maxWant: "write",
    have: { contents: "write" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };
  const roleBResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: "role-b",
        account: "account-a",
        repos: "all",
        permissions: { contents: "write" },
      },
      repos: "all",
    },
    maxWant: "write",
    have: { contents: "write" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };

  const results = await createTokens([roleAResult, roleBResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Write token created with access to all repos in account-a:
      ✅ Has write access with role role-a
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ contents: write

    Token #2:

    ✅ Write token created with access to all repos in account-a:
      ✅ Has write access with role role-b
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ contents: write
    "
  `);
  expect(results.get(roleAResult)).not.toBe(results.get(roleBResult));
});

it("doesn't deduplicate tokens with different permissions", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    metadata: "read",
    contents: "read",
  });
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
  __addInstallationToken(111, "all", { contents: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const metadataResult: TokenAuthResult = {
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
  const contentsResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "read" },
      },
      repos: "all",
    },
    maxWant: "read",
    have: { contents: "read" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };

  const results = await createTokens([metadataResult, contentsResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ contents: read
    "
  `);
  expect(results.get(metadataResult)).not.toBe(results.get(contentsResult));
});

it("doesn't deduplicate tokens with different repos", async () => {
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
  __addInstallationToken(111, ["repo-a"], { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const allReposResult: TokenAuthResult = {
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
  const selectedReposResult: TokenAuthResult = {
    type: "SELECTED_REPOS",
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
    results: {
      "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
    },
    isMatched: true,
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
  };

  const results = await createTokens([allReposResult, selectedReposResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ✅ Read-only token created with access to 1 repo in account-a:
      ✅ Has read access without a role
      ✅ Has access to 1 repo in account-a:
        ✅ account-a/repo-a
      ✅ Has 1 permission:
        ✅ metadata: read
    "
  `);

  expect(results.get(allReposResult)).not.toBe(
    results.get(selectedReposResult),
  );
});

it("doesn't return cached CREATED result for NOT_ALLOWED auth results", async () => {
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

  const createTokens = createTokenFactory(findIssuerOctokit);

  const allowedResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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
  const notAllowedResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
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
    isAllowed: false,
    rules: [],
  };

  await createTokens([allowedResult, notAllowedResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ❌ Refused to create read-only token with access to all repos in account-a:
      ❌ Token not allowed
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read
    "
  `);
});

it("caches NO_ISSUER results for identical token shapes", async () => {
  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();

  const appsInput: AppInput[] = [];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const createTokens = createTokenFactory(findIssuerOctokit);

  const consumerAResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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
  const consumerBResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
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

  const results = await createTokens([consumerAResult, consumerBResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ No suitable issuer
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read

    Token #2:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ No suitable issuer
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read
    "
  `);
  expect(results.get(consumerAResult)).toEqual({ type: "NO_ISSUER" });
  expect(results.get(consumerAResult)).toBe(results.get(consumerBResult));
});

it("caches error results for identical token shapes", async () => {
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

  const createTokens = createTokenFactory(findIssuerOctokit);

  const consumerAResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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
  const consumerBResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
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

  const results = await createTokens([consumerAResult, consumerBResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ 401 - Unauthorized
    ::debug::      (no response data)
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read

    Token #2:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ 401 - Unauthorized
    ::debug::      (no response data)
      ℹ️ Wanted read access without a role
      ℹ️ Wanted access to all repos in account-a
      ℹ️ Wanted 1 permission:
        ℹ️ metadata: read
    "
  `);
  const cachedResult = results.get(consumerAResult);

  expect(cachedResult).toMatchObject({
    type: "REQUEST_ERROR",
    error: { status: 401 },
  });
  expect(results.get(consumerAResult)).toBe(results.get(consumerBResult));
});

it("logs dedup-aware message when tokens are deduplicated", async () => {
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

  const createTokens = createTokenFactory(findIssuerOctokit);

  const consumerAResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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
  const consumerBResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
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

  await createTokens([consumerAResult, consumerBResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ✅ Same token as #1
    "
  `);
});

it("logs simple message when no tokens are deduplicated", async () => {
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

  const createTokens = createTokenFactory(findIssuerOctokit);

  const consumerAResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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

  await createTokens([consumerAResult]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read
    "
  `);
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

  const results = await createTokens([]);

  expect(Array.from(results.entries())).toEqual([]);
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    ::warning::⚠️ No tokens were created
    "
  `);
});

it("renders admin access level in explainer output", () => {
  const authResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: "all",
        permissions: { organization_administration: "admin", metadata: "read" },
      },
      repos: "all",
    },
    maxWant: "admin",
    have: { organization_administration: "admin", metadata: "read" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };
  const creationResult: TokenCreationResult = {
    type: "CREATED",
    token: "token" as never,
  };
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [authResult, creationResult],
  ]);
  const explain = createTextTokenCreationExplainer(results);

  expect(explain(authResult, creationResult)).toMatchInlineSnapshot(`
    "✅ Admin token created with access to all repos in account-a:
      ✅ Has admin access with role role-a
      ✅ Has access to all repos in account-a
      ✅ Has 2 permissions:
        ✅ metadata: read
        ✅ organization_administration: admin"
  `);
});

it("renders no-repos (account-only) access in explainer output", () => {
  const authResult: TokenAuthResult = {
    type: "NO_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: {
        shared: false,
        as: "role-a",
        account: "account-a",
        repos: [],
        permissions: { organization_administration: "admin" },
      },
      repos: [],
    },
    maxWant: "admin",
    have: { organization_administration: "admin" },
    isSufficient: true,
    isMissingRole: false,
    isAllowed: true,
    rules: [],
  };
  const creationResult: TokenCreationResult = {
    type: "CREATED",
    token: "token" as never,
  };
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [authResult, creationResult],
  ]);
  const explain = createTextTokenCreationExplainer(results);

  expect(explain(authResult, creationResult)).toMatchInlineSnapshot(`
    "✅ Admin token created with access to account-a:
      ✅ Has admin access with role role-a
      ✅ Has account-only access
      ✅ Has 1 permission:
        ✅ organization_administration: admin"
  `);
});

it("renders empty permissions in explainer output", () => {
  const authResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: {},
      },
      repos: "all",
    },
    maxWant: "read",
    have: {},
    isSufficient: false,
    isMissingRole: false,
    isAllowed: false,
    rules: [],
  };
  const creationResult: TokenCreationResult = { type: "NOT_ALLOWED" };
  const results = new Map<TokenAuthResult, TokenCreationResult>([
    [authResult, creationResult],
  ]);
  const explain = createTextTokenCreationExplainer(results);

  expect(explain(authResult, creationResult)).toMatchInlineSnapshot(`
    "❌ Refused to create token with access to all repos in account-a:
      ❌ Token not allowed
      ℹ️ Wanted access to all repos in account-a
      ❌ No permissions requested"
  `);
});
