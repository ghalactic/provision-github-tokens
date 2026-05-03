import { beforeEach, expect, it, vi } from "vitest";
import {
  __getOutput,
  __reset as __resetCore,
} from "../__mocks__/@actions/core.js";
import {
  TestRequestError,
  __addInstallationToken,
  __reset as __resetOctokit,
  __setErrors,
} from "../__mocks__/@octokit/action.js";
import { createTestAppRegistry } from "../test/app-registry.js";
import { createTestTokenDec } from "../test/declaration.js";
import {
  createTestApps,
  createTestInstallationAccounts,
} from "../test/github-api.js";
import { createTestOctokitFactory } from "../test/octokit-factory.js";
import { createTestTokenAuthResult } from "../test/result.js";
import { createTokenFactory } from "./token-factory.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

it("warns when no token requests are provided", async () => {
  const appRegistry = createTestAppRegistry();
  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);
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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { metadata: "read" });
  const createTokens = createTokenFactory(findIssuerOctokit);

  const createdResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "write" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { contents: "write" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({
        as: "role-a",
        permissions: { contents: "write" },
      }),
      repos: "all",
    },
    maxWant: "write",
    have: { contents: "write" },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { organization_administration: "admin", metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", {
    organization_administration: "admin",
    metadata: "read",
  });
  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({
        as: "role-a",
        permissions: { organization_administration: "admin", metadata: "read" },
      }),
      repos: "all",
    },
    maxWant: "admin",
    have: { organization_administration: "admin", metadata: "read" },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { organization_administration: "admin" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, [], { organization_administration: "admin" });
  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    type: "NO_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({
        as: "role-a",
        repos: [],
        permissions: { organization_administration: "admin" },
      }),
      repos: [],
    },
    maxWant: "admin",
    have: { organization_administration: "admin" },
  });

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
  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

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
  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, ["repo-a", "repo-b"], { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({
        repos: ["repo-a", "repo-b"],
      }),
      repos: ["repo-a", "repo-b"],
    },
    results: {
      "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
      "repo-b": { rules: [], have: { metadata: "read" }, isSufficient: true },
    },
    isMatched: true,
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { contents: "none", metadata: "read" });
  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({
        permissions: { contents: "none", metadata: "read" },
      }),
      repos: "all",
    },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const consumerAResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });
  const consumerBResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-b" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });
  const consumerCResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-c" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

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
  const appRegistry = createTestAppRegistry();

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);
  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });
  const authResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-b" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read", contents: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [
    new TestRequestError(403, { message: "Resource not accessible" }),
    unexpectedError,
  ]);
  __addInstallationToken(111, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  // RequestError deduping
  const authResultA = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });
  const authResultB = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-b" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

  // Non-RequestError deduping (different permissions = different cache key)
  const authResultC = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
      repos: "all",
    },
    have: { contents: "read" },
  });
  const authResultD = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-b" },
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
      repos: "all",
    },
    have: { contents: "read" },
  });

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
  const [[accountA, [repoA]], [accountB, [repoB]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "account-a", ["repo-a"]],
      ["Organization", 200, "account-b", ["repo-b"]],
    );
  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [
      [111, accountA],
      [112, accountB],
    ],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [
      [appAInstallationA, [repoA]],
      [appAInstallationB, [repoB]],
    ],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { metadata: "read" });
  __addInstallationToken(112, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const accountAResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });
  const accountBResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({ account: "account-b" }),
      repos: "all",
    },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { contents: "write" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a", "role-b"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { contents: "write" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const roleAResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec({
        as: "role-a",
        permissions: { contents: "write" },
      }),
      repos: "all",
    },
    maxWant: "write",
    have: { contents: "write" },
  });
  const roleBResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec({
        as: "role-b",
        permissions: { contents: "write" },
      }),
      repos: "all",
    },
    maxWant: "write",
    have: { contents: "write" },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read", contents: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { metadata: "read" });
  __addInstallationToken(111, "all", { contents: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const metadataResult = createTestTokenAuthResult();
  const contentsResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec({ permissions: { contents: "read" } }),
      repos: "all",
    },
    have: { contents: "read" },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(111, "all", { metadata: "read" });
  __addInstallationToken(111, ["repo-a"], { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const allReposResult = createTestTokenAuthResult();
  const selectedReposResult = createTestTokenAuthResult({
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec({
        repos: ["repo-a"],
      }),
      repos: ["repo-a"],
    },
    results: {
      "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
    },
    isMatched: true,
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const notAllowedResult = createTestTokenAuthResult({
    isAllowed: false,
    maxWant: "write",
    have: { metadata: "read" },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const notAllowedResultA = createTestTokenAuthResult({
    isAllowed: false,
    request: {
      consumer: { account: "account-x" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
    maxWant: "write",
    have: { metadata: "read" },
  });
  const notAllowedResultB = createTestTokenAuthResult({
    isAllowed: false,
    request: {
      consumer: { account: "account-y", repo: "repo-y" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
    maxWant: "write",
    have: { metadata: "read" },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const emptyPermissionsResult = createTestTokenAuthResult({
    isAllowed: false,
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({ permissions: {} }),
      repos: "all",
    },
  });

  // Also applies when all permissions have explicit "none" access levels
  const allNonePermissionsResult = createTestTokenAuthResult({
    isAllowed: false,
    request: {
      consumer: { account: "consumer-b" },
      tokenDec: createTestTokenDec({
        permissions: { contents: "none", metadata: "none" },
      }),
      repos: "all",
    },
  });

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
  const appRegistry = createTestAppRegistry();

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const noIssuerResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec({ account: "account-b" }),
      repos: "all",
    },
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __setErrors("apps.createInstallationAccessToken", [
    new TestRequestError(403, { message: "Resource not accessible" }),
    new TestRequestError(500),
  ]);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const allReposAuthResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

  const selectedReposAuthResult = createTestTokenAuthResult({
    type: "SELECTED_REPOS",
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec({
        repos: ["repo-a"],
      }),
      repos: ["repo-a"],
    },
    results: {
      "repo-a": { rules: [], have: { metadata: "read" }, isSufficient: true },
    },
    isMatched: true,
  });

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
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    110,
    "app-a",
    "App A",
    { metadata: "read" },
    [[111, accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [unexpectedError]);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

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
