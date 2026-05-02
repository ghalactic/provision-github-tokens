import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  TestRequestError,
  __addInstallationToken,
  __reset as __resetOctokit,
  __setApps,
  __setErrors,
  __setInstallations,
} from "../__mocks__/@octokit/action.js";
import {
  createTestApp,
  createTestInstallation,
  createTestInstallationAccount,
  createTestInstallationRepo,
} from "../test/github-api.js";
import {
  createAppRegistry,
  type AppRegistration,
  type InstallationRegistration,
} from "./app-registry.js";
import { createFindIssuerOctokit } from "./issuer-octokit.js";
import { createOctokitFactory } from "./octokit.js";
import { createTokenFactory } from "./token-factory.js";
import type { AppInput } from "./type/input.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("warns when no token requests are provided", async () => {
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

it("creates read-only tokens", async () => {
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

  await createTokens([createdResult]);

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

it("creates write tokens", async () => {
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
    issuer: { enabled: true, roles: ["role-a"] },
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
      issuer: { enabled: true, roles: ["role-a"] },
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

  const authResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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

  await createTokens([authResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Write token created with access to all repos in account-a:
      ✅ Has write access with role role-a
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ contents: write

    "
  `);
});

it("creates admin tokens", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    organization_administration: "admin",
    metadata: "read",
  });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: ["role-a"] },
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
      issuer: { enabled: true, roles: ["role-a"] },
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
  __addInstallationToken(111, "all", {
    organization_administration: "admin",
    metadata: "read",
  });
  const createTokens = createTokenFactory(findIssuerOctokit);

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

  await createTokens([authResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Admin token created with access to all repos in account-a:
      ✅ Has admin access with role role-a
      ✅ Has access to all repos in account-a
      ✅ Has 2 permissions:
        ✅ metadata: read
        ✅ organization_administration: admin

    "
  `);
});

it("creates account-only tokens", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    organization_administration: "admin",
  });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: ["role-a"] },
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
      issuer: { enabled: true, roles: ["role-a"] },
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
  __addInstallationToken(111, [], { organization_administration: "admin" });
  const createTokens = createTokenFactory(findIssuerOctokit);

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

  await createTokens([authResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Admin token created with access to account-a:
      ✅ Has admin access with role role-a
      ✅ Has account-only access
      ✅ Has 1 permission:
        ✅ organization_administration: admin

    "
  `);
});

it("creates all-repos tokens", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { metadata: "read" });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA, repoB],
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
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);
  __addInstallationToken(111, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult: TokenAuthResult = {
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

  await createTokens([authResult]);

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

it("creates selected-repos tokens", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountA, "repo-b");
  const appA = createTestApp(110, "app-a", "App A", { metadata: "read" });
  const appRegA: AppRegistration = {
    app: appA,
    issuer: { enabled: true, roles: [] },
    provisioner: { enabled: false },
  };
  const appAInstallationA = createTestInstallation(111, appA, accountA, "all");
  const appAInstallationRegA: InstallationRegistration = {
    installation: appAInstallationA,
    repos: [repoA, repoB],
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
  __setInstallations([[appAInstallationA, [repoA, repoB]]]);
  __addInstallationToken(111, ["repo-a", "repo-b"], { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult: TokenAuthResult = {
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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

  await createTokens([authResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to 2 repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to 2 repos in account-a:
        ✅ account-a/repo-a
        ✅ account-a/repo-b
      ✅ Has 1 permission:
        ✅ metadata: read

    "
  `);
});

it('ignores permissions with "none" access level', async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const appA = createTestApp(110, "app-a", "App A", {
    metadata: "read",
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
  __addInstallationToken(111, "all", { contents: "none", metadata: "read" });
  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "none", metadata: "read" },
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

  await createTokens([authResult]);

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

it("reuses one token for identical requests", async () => {
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
  const consumerCResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-c" },
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

  await createTokens([consumerAResult, consumerBResult, consumerCResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ✅ Same result as token #1

    Token #3:

    ✅ Same result as token #1

    "
  `);
});

it("reuses the same no-issuer outcome for identical requests", async () => {
  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();

  const appsInput: AppInput[] = [];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );
  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResultA: TokenAuthResult = {
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
  const authResultB: TokenAuthResult = {
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

  await createTokens([authResultA, authResultB]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ No suitable issuer
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    Token #2:

    ❌ Same result as token #1

    "
  `);
});

it("reuses the same failure outcome for identical requests", async () => {
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
  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [
    new TestRequestError(403, { message: "Resource not accessible" }),
    unexpectedError,
  ]);
  __addInstallationToken(111, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  // RequestError deduping
  const authResultA: TokenAuthResult = {
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
  const authResultB: TokenAuthResult = {
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

  // Non-RequestError deduping (different permissions = different cache key)
  const authResultC: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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
  const authResultD: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
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

  const results = await createTokens([
    authResultA,
    authResultB,
    authResultC,
    authResultD,
  ]);

  expect(results.get(authResultA)).toBe(results.get(authResultB));
  expect(results.get(authResultC)).toBe(results.get(authResultD));
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    Token #2:

    ❌ Same result as token #1

    Token #3:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ <message>
    ::debug::      Error: <message>\\n    at token-factory.ts:1:1
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ contents: read

    Token #4:

    ❌ Same result as token #3

    "
  `);
});

it("creates separate tokens when the requested account is different", async () => {
  const octokitFactory = createOctokitFactory();

  const accountA = createTestInstallationAccount(
    "Organization",
    100,
    "account-a",
  );
  const accountB = createTestInstallationAccount(
    "Organization",
    200,
    "account-b",
  );
  const repoA = createTestInstallationRepo(accountA, "repo-a");
  const repoB = createTestInstallationRepo(accountB, "repo-b");
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
  const appAInstallationB = createTestInstallation(112, appA, accountB, "all");
  const appAInstallationRegB: InstallationRegistration = {
    installation: appAInstallationB,
    repos: [repoB],
  };
  const appRegistry = createAppRegistry();
  appRegistry.registerApp(appRegA);
  appRegistry.registerInstallation(appAInstallationRegA);
  appRegistry.registerInstallation(appAInstallationRegB);

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
  __setInstallations([
    [appAInstallationA, [repoA]],
    [appAInstallationB, [repoB]],
  ]);
  __addInstallationToken(111, "all", { metadata: "read" });
  __addInstallationToken(112, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const accountAResult: TokenAuthResult = {
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
  const accountBResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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

  await createTokens([accountAResult, accountBResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ✅ Read-only token created with access to all repos in account-a:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-a
      ✅ Has 1 permission:
        ✅ metadata: read

    Token #2:

    ✅ Read-only token created with access to all repos in account-b:
      ✅ Has read access without a role
      ✅ Has access to all repos in account-b
      ✅ Has 1 permission:
        ✅ metadata: read

    "
  `);
});

it("creates separate tokens when the requested role is different", async () => {
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

  await createTokens([roleAResult, roleBResult]);

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
});

it("creates separate tokens when requested permissions are different", async () => {
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

  await createTokens([metadataResult, contentsResult]);

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
});

it("creates separate tokens when requested repository access is different", async () => {
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

  await createTokens([allReposResult, selectedReposResult]);

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
});

it("doesn't create tokens when not allowed", async () => {
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

  await createTokens([notAllowedResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Refused to create read-only token with access to all repos in account-a:
      ❌ Token not allowed for account account-a
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    "
  `);
});

it("shows separate explanations for non-allowed tokens", async () => {
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

  const notAllowedResultA: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-x" },
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
  const notAllowedResultB: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "account-y", repo: "repo-y" },
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

  const results = await createTokens([notAllowedResultA, notAllowedResultB]);

  expect(results.get(notAllowedResultA)).not.toBe(
    results.get(notAllowedResultB),
  );
  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Refused to create read-only token with access to all repos in account-a:
      ❌ Token not allowed for account account-x
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    Token #2:

    ❌ Refused to create read-only token with access to all repos in account-a:
      ❌ Token not allowed for repo account-y/repo-y
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    "
  `);
});

it("explains when no permissions were requested", async () => {
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

  const emptyPermissionsResult: TokenAuthResult = {
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

  // Also applies when all permissions have explicit "none" access levels
  const allNonePermissionsResult: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-b" },
      tokenDec: {
        shared: false,
        as: undefined,
        account: "account-a",
        repos: "all",
        permissions: { contents: "none", metadata: "none" },
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

  await createTokens([emptyPermissionsResult, allNonePermissionsResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Refused to create token with access to all repos in account-a:
      ❌ Token not allowed for account consumer-a
      ➖ Wanted access to all repos in account-a
      ❌ No permissions requested

    Token #2:

    ❌ Refused to create token with access to all repos in account-a:
      ❌ Token not allowed for account consumer-b
      ➖ Wanted access to all repos in account-a
      ❌ No permissions requested

    "
  `);
});

it("fails when no suitable issuer can create the token", async () => {
  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();

  const appsInput: AppInput[] = [];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const createTokens = createTokenFactory(findIssuerOctokit);

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

  await createTokens([noIssuerResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-b:
      ❌ No suitable issuer
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-b
      ➖ Wanted 1 permission:
        ➖ metadata: read

    "
  `);
});

it("explains failures caused by GitHub API errors", async () => {
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
  __setErrors("apps.createInstallationAccessToken", [
    new TestRequestError(403, { message: "Resource not accessible" }),
    new TestRequestError(500),
  ]);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const allReposAuthResult: TokenAuthResult = {
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

  const selectedReposAuthResult: TokenAuthResult = {
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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

  await createTokens([allReposAuthResult, selectedReposAuthResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ 403 - Forbidden
    ::debug::      {
    ::debug::        "message": "Resource not accessible"
    ::debug::      }
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    Token #2:

    ❌ Failed to create read-only token with access to 1 repo in account-a:
      ❌ 500 - Internal Server Error
    ::debug::      (no response data)
      ➖ Wanted read access without a role
      ➖ Wanted access to 1 repo in account-a:
        ➖ account-a/repo-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    "
  `);
});

it("explains failures caused by unexpected errors", async () => {
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
  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [unexpectedError]);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult: TokenAuthResult = {
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

  await createTokens([authResult]);

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ <message>
    ::debug::      Error: <message>\\n    at token-factory.ts:1:1
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    "
  `);
});
