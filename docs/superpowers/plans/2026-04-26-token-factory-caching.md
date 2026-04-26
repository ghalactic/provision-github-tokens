# Token factory caching implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deduplicate `createInstallationAccessToken` API calls when multiple
consumers request the same token shape.

**Architecture:** A private cache key function extracts
`{ account, as, permissions, repos }` from a `TokenRequest` and serializes it
via `fast-json-stable-stringify`. The factory loop checks the cache after the
`isAllowed` guard. A `Record<string, TokenCreationResult>` stores results keyed
by the serialized string. Logging reports both unique and total counts when they
differ.

**Tech Stack:** TypeScript, Vitest, fast-json-stable-stringify (already a
dependency)

---

## File structure

- **Modify:** `src/token-factory.ts` — add private `tokenCreationCacheKey`
  function, add cache lookup/store to factory loop, update logging to report
  unique vs total counts
- **Modify:** `test/suite/unit/token-factory.spec.ts` — add tests for
  deduplication behavior, NOT_ALLOWED bypass, NO_ISSUER caching, error caching,
  role-based isolation, and dedup-aware log messages

---

## Task 1: Test and implement token deduplication for identical requests

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`
- Modify: `src/token-factory.ts`

- [ ] **Step 1: Write the failing test for deduplication**

Add a test that creates two `TokenAuthResult` objects with different consumers
but the same token shape `(account, as, permissions, repos)`, passes them both
to the factory, and asserts they receive the same `TokenCreationResult` object
by reference identity.

```ts
it("deduplicates tokens with the same shape but different consumers", async () => {
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

  const authA: TokenAuthResult = {
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
  const authB: TokenAuthResult = {
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

  const results = await createTokens([authA, authB]);
  const resultA = results.get(authA);
  const resultB = results.get(authB);

  expect(resultA).toBeDefined();
  expect(resultA?.type).toBe("CREATED");
  expect(resultA).toBe(resultB);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: FAIL — `resultA` and `resultB` are different objects because the
factory currently creates a new result for each auth result.

- [ ] **Step 3: Implement the cache in the token factory**

In `src/token-factory.ts`, add a `fast-json-stable-stringify` import and a
private `tokenCreationCacheKey` function. Add a
`Record<string, TokenCreationResult>` cache inside the returned async function.
Insert a cache lookup after the `isAllowed` check, and store results in the
cache after issuer resolution or API calls.

```ts
import { info } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import stringify from "fast-json-stable-stringify";
import type { FindIssuerOctokit } from "./issuer-octokit.js";
import { pluralize } from "./pluralize.js";
import type { InstallationToken } from "./type/github-api.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenRequest } from "./token-request.js";

export type TokenFactory = (
  authResults: TokenAuthResult[],
) => Promise<Map<TokenAuthResult, TokenCreationResult>>;

export type TokenCreationResult =
  | TokenCreationNotAllowedResult
  | TokenCreationNoIssuerResult
  | TokenCreationCreatedResult
  | TokenCreationRequestErrorResult
  | TokenCreationErrorResult;

export type TokenCreationNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type TokenCreationNoIssuerResult = {
  type: "NO_ISSUER";
};

export type TokenCreationCreatedResult = {
  type: "CREATED";
  token: InstallationToken;
};

export type TokenCreationRequestErrorResult = {
  type: "REQUEST_ERROR";
  error: RequestError;
};

export type TokenCreationErrorResult = {
  type: "ERROR";
  error: unknown;
};

function tokenCreationCacheKey(request: TokenRequest): string {
  return stringify({
    account: request.tokenDec.account,
    as: request.tokenDec.as,
    permissions: request.tokenDec.permissions,
    repos: request.repos,
  });
}

export function createTokenFactory(
  findIssuerOctokit: FindIssuerOctokit,
): TokenFactory {
  return async (authResults) => {
    const cache: Record<string, TokenCreationResult> = {};
    const creationResults = new Map<TokenAuthResult, TokenCreationResult>();

    for (const auth of authResults) {
      if (!auth.isAllowed) {
        creationResults.set(auth, { type: "NOT_ALLOWED" });

        continue;
      }

      const key = tokenCreationCacheKey(auth.request);
      const cached = cache[key];

      if (cached) {
        creationResults.set(auth, cached);

        continue;
      }

      const found = findIssuerOctokit(auth.request);

      if (!found) {
        const result: TokenCreationResult = { type: "NO_ISSUER" };
        cache[key] = result;
        creationResults.set(auth, result);

        continue;
      }

      const [octokit, issuerReg] = found;

      try {
        const { data: token } =
          await octokit.rest.apps.createInstallationAccessToken({
            installation_id: issuerReg.installation.id,
            repositories:
              auth.request.repos === "all" ? undefined : auth.request.repos,
            permissions: auth.request.tokenDec.permissions,
          });

        const result: TokenCreationResult = { type: "CREATED", token };
        cache[key] = result;
        creationResults.set(auth, result);
      } catch (error) {
        const result: TokenCreationResult =
          error instanceof RequestError
            ? { type: "REQUEST_ERROR", error }
            : { type: "ERROR", error };
        cache[key] = result;
        creationResults.set(auth, result);
      }
    }

    let createdCount = 0;
    let notCreatedCount = 0;

    for (const result of creationResults.values()) {
      if (result.type === "CREATED") {
        ++createdCount;
      } else {
        ++notCreatedCount;
      }
    }

    if (createdCount > 0) {
      info(`Created ${pluralize(createdCount, "token", "tokens")}`);
    }
    if (notCreatedCount > 0) {
      const pluralized = pluralize(
        notCreatedCount,
        "requested token wasn't",
        "requested tokens weren't",
      );
      info(`${pluralized} created`);
    }

    return creationResults;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: PASS — both auth results now share the same `TokenCreationResult`
object.

- [ ] **Step 5: Commit**

```bash
git add src/token-factory.ts test/suite/unit/token-factory.spec.ts
git commit -m "Add token creation caching by token shape"
```

---

## Task 2: Test and implement role-based isolation

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`
- Modify: `src/token-factory.ts` (already implemented — this task just adds the
  test to confirm behavior)

- [ ] **Step 1: Write the failing test for role isolation**

Add a test that creates two auth results with the same
`(account, permissions, repos)` but different `as` values. Assert they receive
**different** `TokenCreationResult` objects.

```ts
it("does not deduplicate tokens with different roles", async () => {
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
  __addInstallationToken(111, "all", { contents: "write" });

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authA: TokenAuthResult = {
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
  const authB: TokenAuthResult = {
    type: "ALL_REPOS",
    request: {
      consumer: { account: "consumer-a" },
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

  const results = await createTokens([authA, authB]);
  const resultA = results.get(authA);
  const resultB = results.get(authB);

  expect(resultA).toBeDefined();
  expect(resultB).toBeDefined();
  expect(resultA?.type).toBe("CREATED");
  expect(resultB?.type).toBe("CREATED");
  expect(resultA).not.toBe(resultB);
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: PASS — different `as` values produce different cache keys.

- [ ] **Step 3: Commit**

```bash
git add test/suite/unit/token-factory.spec.ts
git commit -m "Add test for role-based token isolation"
```

---

## Task 3: Test NOT_ALLOWED bypass of cache

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`

- [ ] **Step 1: Write the test for NOT_ALLOWED bypass**

An unauthorized auth result gets `NOT_ALLOWED` even when an allowed result with
the same token shape was cached as `CREATED`.

```ts
it("returns NOT_ALLOWED for unauthorized requests even when a cached token exists", async () => {
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

  const allowedAuth: TokenAuthResult = {
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
  const notAllowedAuth: TokenAuthResult = {
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
    isSufficient: false,
    isMissingRole: false,
    isAllowed: false,
    rules: [],
  };

  const results = await createTokens([allowedAuth, notAllowedAuth]);

  expect(results.get(allowedAuth)?.type).toBe("CREATED");
  expect(results.get(notAllowedAuth)).toEqual({ type: "NOT_ALLOWED" });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: PASS — `NOT_ALLOWED` is assigned before the cache lookup.

- [ ] **Step 3: Commit**

```bash
git add test/suite/unit/token-factory.spec.ts
git commit -m "Add test for NOT_ALLOWED bypass of token cache"
```

---

## Task 4: Test NO_ISSUER caching

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`

- [ ] **Step 1: Write the test for NO_ISSUER caching**

Two auth results that share a token shape and have no issuer receive the same
`NO_ISSUER` result object.

```ts
it("caches NO_ISSUER results for requests with the same shape", async () => {
  const octokitFactory = createOctokitFactory();
  const appRegistry = createAppRegistry();
  const appsInput: AppInput[] = [];
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authA: TokenAuthResult = {
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
  const authB: TokenAuthResult = {
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

  const results = await createTokens([authA, authB]);
  const resultA = results.get(authA);
  const resultB = results.get(authB);

  expect(resultA).toBeDefined();
  expect(resultA?.type).toBe("NO_ISSUER");
  expect(resultA).toBe(resultB);
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: PASS — the `NO_ISSUER` result is cached and reused.

- [ ] **Step 3: Commit**

```bash
git add test/suite/unit/token-factory.spec.ts
git commit -m "Add test for NO_ISSUER caching in token factory"
```

---

## Task 5: Test error caching

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`

- [ ] **Step 1: Write the test for error caching**

Two auth results with the same token shape where the API call fails. The second
result should receive the same cached error object.

```ts
it("caches error results for requests with the same shape", async () => {
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
  // No matching token registered, so the mock throws a 401 RequestError

  const createTokens = createTokenFactory(findIssuerOctokit);

  const authA: TokenAuthResult = {
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
  const authB: TokenAuthResult = {
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

  const results = await createTokens([authA, authB]);
  const resultA = results.get(authA);
  const resultB = results.get(authB);

  expect(resultA).toBeDefined();
  expect(resultA?.type).toBe("REQUEST_ERROR");
  expect(resultA).toBe(resultB);
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: PASS — the `REQUEST_ERROR` result is cached and reused.

- [ ] **Step 3: Commit**

```bash
git add test/suite/unit/token-factory.spec.ts
git commit -m "Add test for error caching in token factory"
```

---

## Task 6: Test and implement dedup-aware logging

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`
- Modify: `src/token-factory.ts`

- [ ] **Step 1: Write the failing test for dedup-aware log message**

When deduplication occurs, the log should say
`Created N unique tokens for M token requests`.

```ts
it("logs unique and total counts when deduplication occurs", async () => {
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

  const authA: TokenAuthResult = {
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
  const authB: TokenAuthResult = {
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

  await createTokens([authA, authB]);

  expect(__getOutput()).toContain(
    "Created 1 unique token for 2 token requests",
  );
});
```

Note: this also imports `__getOutput` from the core mock. Ensure the import at
the top of the test file includes it:

```ts
import {
  __getOutput,
  __reset as __resetCore,
} from "../../../__mocks__/@actions/core.js";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: FAIL — current logging says `Created 2 tokens`, not the dedup-aware
message.

- [ ] **Step 3: Implement dedup-aware logging**

In `src/token-factory.ts`, update the logging section. Count unique created
tokens from the `cache` object, count total from the results map. When they
differ, use the dedup-aware format.

Replace the logging section (after the main loop) with:

```ts
let createdCount = 0;
let notCreatedCount = 0;

for (const result of creationResults.values()) {
  if (result.type === "CREATED") {
    ++createdCount;
  } else {
    ++notCreatedCount;
  }
}

if (createdCount > 0) {
  let uniqueCreatedCount = 0;

  for (const key in cache) {
    if (cache[key].type === "CREATED") {
      ++uniqueCreatedCount;
    }
  }

  if (uniqueCreatedCount < createdCount) {
    const uniqueTokens = pluralize(
      uniqueCreatedCount,
      "unique token",
      "unique tokens",
    );
    const tokenRequests = pluralize(
      createdCount,
      "token request",
      "token requests",
    );
    info(`Created ${uniqueTokens} for ${tokenRequests}`);
  } else {
    info(`Created ${pluralize(createdCount, "token", "tokens")}`);
  }
}

if (notCreatedCount > 0) {
  const pluralized = pluralize(
    notCreatedCount,
    "requested token wasn't",
    "requested tokens weren't",
  );
  info(`${pluralized} created`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: PASS — dedup-aware log message is produced.

- [ ] **Step 5: Commit**

```bash
git add src/token-factory.ts test/suite/unit/token-factory.spec.ts
git commit -m "Add dedup-aware logging to token factory"
```

---

## Task 7: Run existing tests and verify no regressions

**Files:**

- None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts`

Expected: All tests pass, including the pre-existing tests.

- [ ] **Step 2: Run linting**

Run: `make lint`

Expected: No errors.

- [ ] **Step 3: Regenerate, stage, and precommit**

Run the standard workflow for generated files:

```bash
make regenerate
git add -A
make precommit
```

Expected: Clean precommit pass.

- [ ] **Step 4: Commit regenerated files if changed**

```bash
git add -A
git commit -m "Regenerate dist bundle"
```
