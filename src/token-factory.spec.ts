import { join } from "node:path";
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
import { toMarkdown } from "./markdown.js";
import { createMarkdownTokenCreationExplainer } from "./token-creation-explainer/markdown.js";
import { createTokenFactory } from "./token-factory.js";

vi.mock("@actions/core");
vi.mock("@octokit/action");

beforeEach(() => {
  __resetCore();
  __resetOctokit();
});

const fixturesPath = join(import.meta.dirname, "testdata/token-creation");

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
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });
  const createTokens = createTokenFactory(findIssuerOctokit);

  const createdResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "account-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

  const results = await createTokens([createdResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(createdResult, results.get(createdResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "read-only/created.md"));
});

it("creates write tokens", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { contents: "write" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { contents: "write" });

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

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "write/auth.md"));
});

it("creates admin tokens", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { organization_administration: "admin", metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", {
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

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "admin/auth.md"));
});

it("creates account-only tokens", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { organization_administration: "admin" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, [], {
    organization_administration: "admin",
  });
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

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "account-only/auth.md"));
});

it("creates all-repos tokens", async () => {
  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "all-repos/auth.md"));
});

it("creates selected-repos tokens", async () => {
  const [[accountA, [repoA, repoB]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a", "repo-b"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA, repoB]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, ["repo-a", "repo-b"], {
    metadata: "read",
  });

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

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "selected-repos/auth.md"));
});

it('ignores permissions with "none" access level', async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", {
    contents: "none",
    metadata: "read",
  });
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

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "none-access/auth.md"));
});

it("reuses one token for identical requests", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });

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

  const results = await createTokens([
    consumerAResult,
    consumerBResult,
    consumerCResult,
  ]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(consumerAResult, results.get(consumerAResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-identical/consumer-a.md"));
  await expect(
    toMarkdown(toMdast(consumerBResult, results.get(consumerBResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-identical/consumer-b.md"));
  await expect(
    toMarkdown(toMdast(consumerCResult, results.get(consumerCResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-identical/consumer-c.md"));
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

  const results = await createTokens([authResultA, authResultB]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(authResultA, results.get(authResultA)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-no-issuer/auth-a.md"));
  await expect(
    toMarkdown(toMdast(authResultB, results.get(authResultB)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-no-issuer/auth-b.md"));
});

it("reuses the same failure outcome for identical requests", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read", contents: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [
    new TestRequestError(403, { message: "Resource not accessible" }),
    unexpectedError,
  ]);
  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });

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

  const toMdast = createMarkdownTokenCreationExplainer();

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
    ::debug::      Error: <message>
    ::debug::          at token-factory.ts:1:1
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ contents: read

    Token #4:

    ❌ Same result as token #3

    "
  `);
  await expect(
    toMarkdown(toMdast(authResultA, results.get(authResultA)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-failure/auth-a.md"));
  await expect(
    toMarkdown(toMdast(authResultB, results.get(authResultB)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-failure/auth-b.md"));
  await expect(
    toMarkdown(toMdast(authResultC, results.get(authResultC)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-failure/auth-c.md"));
  await expect(
    toMarkdown(toMdast(authResultD, results.get(authResultD)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "reuses-failure/auth-d.md"));
});

it("creates separate tokens when the requested account is different", async () => {
  const [[accountA, [repoA]], [accountB, [repoB]]] =
    createTestInstallationAccounts(
      ["Organization", 100, "account-a", ["repo-a"]],
      ["Organization", 200, "account-b", ["repo-b"]],
    );
  const [[appA, [appAInstallationA, appAInstallationB]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA], [accountB]],
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

  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });
  __addInstallationToken(appAInstallationB.id, "all", { metadata: "read" });

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

  const results = await createTokens([accountAResult, accountBResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(accountAResult, results.get(accountAResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-account/account-a.md"));
  await expect(
    toMarkdown(toMdast(accountBResult, results.get(accountBResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-account/account-b.md"));
});

it("creates separate tokens when the requested role is different", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { contents: "write" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: ["role-a", "role-b"],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { contents: "write" });

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

  const results = await createTokens([roleAResult, roleBResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(roleAResult, results.get(roleAResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-role/role-a.md"));
  await expect(
    toMarkdown(toMdast(roleBResult, results.get(roleBResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-role/role-b.md"));
});

it("creates separate tokens when requested permissions are different", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read", contents: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });
  __addInstallationToken(appAInstallationA.id, "all", { contents: "read" });

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

  const results = await createTokens([metadataResult, contentsResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(metadataResult, results.get(metadataResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-permissions/metadata.md"));
  await expect(
    toMarkdown(toMdast(contentsResult, results.get(contentsResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-permissions/contents.md"));
});

it("creates separate tokens when requested repository access is different", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  __addInstallationToken(appAInstallationA.id, "all", { metadata: "read" });
  __addInstallationToken(appAInstallationA.id, ["repo-a"], {
    metadata: "read",
  });

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

  const results = await createTokens([allReposResult, selectedReposResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(allReposResult, results.get(allReposResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-repos/all-repos.md"));
  await expect(
    toMarkdown(toMdast(selectedReposResult, results.get(selectedReposResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "separate-repos/selected-repos.md"));
});

it("doesn't create tokens when not allowed", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
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

  const results = await createTokens([notAllowedResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(notAllowedResult, results.get(notAllowedResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "not-allowed/not-allowed.md"));
});

it("shows separate explanations for non-allowed tokens", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
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

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(notAllowedResultA, results.get(notAllowedResultA)!)),
  ).toMatchFileSnapshot(
    join(fixturesPath, "not-allowed-distinct/not-allowed-a.md"),
  );
  await expect(
    toMarkdown(toMdast(notAllowedResultB, results.get(notAllowedResultB)!)),
  ).toMatchFileSnapshot(
    join(fixturesPath, "not-allowed-distinct/not-allowed-b.md"),
  );
});

it("explains when no permissions were requested", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
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

  const results = await createTokens([
    emptyPermissionsResult,
    allNonePermissionsResult,
  ]);

  const toMdast = createMarkdownTokenCreationExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Refused to create no-permission token with access to all repos in account-a:
      ❌ Token not allowed for account consumer-a
      ➖ Wanted access to all repos in account-a
      ❌ No permissions requested

    Token #2:

    ❌ Refused to create no-permission token with access to all repos in account-a:
      ❌ Token not allowed for account consumer-b
      ➖ Wanted access to all repos in account-a
      ❌ No permissions requested

    "
  `);
  await expect(
    toMarkdown(
      toMdast(emptyPermissionsResult, results.get(emptyPermissionsResult)!),
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "no-permissions/empty-permissions.md"),
  );
  await expect(
    toMarkdown(
      toMdast(allNonePermissionsResult, results.get(allNonePermissionsResult)!),
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "no-permissions/all-none-permissions.md"),
  );
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

  const results = await createTokens([noIssuerResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(noIssuerResult, results.get(noIssuerResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "no-issuer/no-issuer.md"));
});

it("explains failures caused by GitHub API errors", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
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

  const results = await createTokens([
    allReposAuthResult,
    selectedReposAuthResult,
  ]);

  const toMdast = createMarkdownTokenCreationExplainer();

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
  await expect(
    toMarkdown(toMdast(allReposAuthResult, results.get(allReposAuthResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "request-error/all-repos-auth.md"));
  await expect(
    toMarkdown(
      toMdast(selectedReposAuthResult, results.get(selectedReposAuthResult)!),
    ),
  ).toMatchFileSnapshot(
    join(fixturesPath, "request-error/selected-repos-auth.md"),
  );
});

it("explains failures caused by unexpected errors", async () => {
  const [[accountA, [repoA]]] = createTestInstallationAccounts([
    "Organization",
    100,
    "account-a",
    ["repo-a"],
  ]);
  const [[appA, [appAInstallationA]]] = createTestApps([
    "App A",
    { metadata: "read" },
    [[accountA]],
  ]);
  const appRegistry = createTestAppRegistry({
    app: appA,
    issuer: [],
    installations: [[appAInstallationA, [repoA]]],
  });

  const { findIssuerOctokit } = createTestOctokitFactory(appRegistry);

  const unexpectedError = new Error("<message>");
  unexpectedError.stack = "Error: <message>\n    at token-factory.ts:1:1";
  __setErrors("apps.createInstallationAccessToken", [unexpectedError]);

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authResult = createTestTokenAuthResult({
    request: {
      consumer: { account: "consumer-a" },
      tokenDec: createTestTokenDec(),
      repos: "all",
    },
  });

  const results = await createTokens([authResult]);

  const toMdast = createMarkdownTokenCreationExplainer();

  expect(__getOutput()).toMatchInlineSnapshot(`
    "
    Token #1:

    ❌ Failed to create read-only token with access to all repos in account-a:
      ❌ <message>
    ::debug::      Error: <message>
    ::debug::          at token-factory.ts:1:1
      ➖ Wanted read access without a role
      ➖ Wanted access to all repos in account-a
      ➖ Wanted 1 permission:
        ➖ metadata: read

    "
  `);
  await expect(
    toMarkdown(toMdast(authResult, results.get(authResult)!)),
  ).toMatchFileSnapshot(join(fixturesPath, "unexpected-error/auth.md"));
});
