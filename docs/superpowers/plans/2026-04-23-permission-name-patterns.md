# Permission Name Patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow glob-style patterns as keys in provider permission rule
`permissions` fields, with two-tier resolution (patterns set baseline via
max-wins, literals unconditionally override).

**Architecture:** The `Pattern` interface gains a `readonly isLiteral` property.
The token authorizer pre-compiles each rule's permission keys into `NamePattern`
objects, then at authorization time resolves them against the requested
permissions using two-tier logic: pattern matches use max-wins, literal matches
unconditionally override. No schema, type, or explainer changes needed.

**Tech Stack:** TypeScript, Vitest

**Spec:**
[`docs/superpowers/specs/2026-04-23-permission-name-patterns-design.md`](../specs/2026-04-23-permission-name-patterns-design.md)

---

## File structure

| File                                                           | Action | Responsibility                                           |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `src/pattern.ts`                                               | Modify | Add `readonly isLiteral` to `Pattern` type               |
| `src/name-pattern.ts`                                          | Modify | Set `isLiteral` based on absence of `*`                  |
| `src/github-pattern.ts`                                        | Modify | Set `isLiteral` based on both parts being literal        |
| `src/token-authorizer.ts`                                      | Modify | Two-tier permission resolution in `updatePermissions`    |
| `test/suite/unit/pattern/name-pattern.spec.ts`                 | Modify | Add `isLiteral` tests                                    |
| `test/suite/unit/pattern/github-pattern.spec.ts`               | Modify | Add `isLiteral` tests                                    |
| `test/suite/unit/token-auth/authorize-token-all-repos.spec.ts` | Modify | Add permission pattern tests for the all-repos auth path |

---

## Task 1: Add `readonly isLiteral` to `Pattern` interface

**Files:**

- Modify: `src/pattern.ts`

- [ ] **Step 1: Add `isLiteral` to the `Pattern` type**

```ts
// src/pattern.ts
export type Pattern = {
  test: (string: string) => boolean;
  toString: () => string;
  readonly isLiteral: boolean;
};
```

This is all that changes in this file. The `anyPatternMatches` function is
unaffected.

- [ ] **Step 2: Run the type checker to see compilation errors**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: Compilation errors in `name-pattern.ts` and `github-pattern.ts`
because the returned objects don't include `isLiteral` yet. This confirms the
type change propagated.

- [ ] **Step 3: Commit**

```bash
git add src/pattern.ts
git commit -m "feat: add readonly isLiteral to Pattern interface"
```

---

## Task 2: Implement `isLiteral` in `NamePattern`

**Files:**

- Modify: `src/name-pattern.ts`
- Modify: `test/suite/unit/pattern/name-pattern.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to the end of `test/suite/unit/pattern/name-pattern.spec.ts`:

```ts
it("is literal when the pattern has no wildcards", () => {
  expect(createNamePattern("contents").isLiteral).toBe(true);
});

it("is literal when the pattern has no wildcards and contains dots", () => {
  expect(createNamePattern("name.a").isLiteral).toBe(true);
});

it("is not literal when the pattern contains a wildcard", () => {
  expect(createNamePattern("secret_*").isLiteral).toBe(false);
});

it("is not literal when the pattern is a lone wildcard", () => {
  expect(createNamePattern("*").isLiteral).toBe(false);
});

it("is not literal when the pattern contains multiple wildcards", () => {
  expect(createNamePattern("*-name-*").isLiteral).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm exec -- vitest --run test/suite/unit/pattern/name-pattern.spec.ts`

Expected: FAIL — `isLiteral` is not a property on the returned object.

- [ ] **Step 3: Implement `isLiteral` in `createNamePattern`**

In `src/name-pattern.ts`, add `isLiteral` to the returned object. A pattern is
literal when the original string contains no `*` — equivalently, when splitting
on `*` produces exactly one segment:

```ts
export function createNamePattern(pattern: string): Pattern {
  if (!pattern) throw new Error("Pattern cannot be empty");

  if (pattern.includes("/")) {
    throw new Error(`Pattern ${JSON.stringify(pattern)} cannot contain /`);
  }

  const literals = pattern.split("*");
  const expression = patternRegExp(literals);

  return {
    test: (string) => expression.test(string),
    toString: () => pattern,
    isLiteral: literals.length === 1,
  };
}
```

The only change is the addition of the `isLiteral` property.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm exec -- vitest --run test/suite/unit/pattern/name-pattern.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/name-pattern.ts test/suite/unit/pattern/name-pattern.spec.ts
git commit -m "feat: implement isLiteral for NamePattern"
```

---

## Task 3: Implement `isLiteral` in `GitHubPattern`

**Files:**

- Modify: `src/github-pattern.ts`
- Modify: `test/suite/unit/pattern/github-pattern.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to the end of `test/suite/unit/pattern/github-pattern.spec.ts`:

```ts
it("is literal for an account-only pattern without wildcards", () => {
  expect(createGitHubPattern("account-a").isLiteral).toBe(true);
});

it("is literal for an account/repo pattern without wildcards", () => {
  expect(createGitHubPattern("account-a/repo-a").isLiteral).toBe(true);
});

it("is not literal when the account part contains a wildcard", () => {
  expect(createGitHubPattern("account-*").isLiteral).toBe(false);
});

it("is not literal when the repo part contains a wildcard", () => {
  expect(createGitHubPattern("account-a/*").isLiteral).toBe(false);
});

it("is not literal when both parts contain wildcards", () => {
  expect(createGitHubPattern("*/*").isLiteral).toBe(false);
});

it("is not literal for a lone wildcard", () => {
  expect(createGitHubPattern("*").isLiteral).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm exec -- vitest --run test/suite/unit/pattern/github-pattern.spec.ts`

Expected: FAIL — `isLiteral` is not a property on the returned object.

- [ ] **Step 3: Implement `isLiteral` in `createGitHubPattern`**

In `src/github-pattern.ts`, derive `isLiteral` from both sub-patterns:

```ts
export function createGitHubPattern(pattern: string): Pattern {
  const [accountPart, repoPart] = splitGitHubPattern(pattern);
  const account = createNamePattern(accountPart);
  const repo = repoPart ? createNamePattern(repoPart) : undefined;

  return {
    test: (string) => {
      const parts = string.split("/");

      if (parts.length === 1) return repo ? false : account.test(parts[0]);
      if (parts.length !== 2 || !repo) return false;

      return account.test(parts[0]) && repo.test(parts[1]);
    },

    toString: () => pattern,

    isLiteral: account.isLiteral && (repo?.isLiteral ?? true),
  };
}
```

The only change is the addition of the `isLiteral` property.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm exec -- vitest --run test/suite/unit/pattern/github-pattern.spec.ts`

Expected: PASS

- [ ] **Step 5: Run all tests to confirm nothing is broken**

Run: `make test`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/github-pattern.ts test/suite/unit/pattern/github-pattern.spec.ts
git commit -m "feat: implement isLiteral for GitHubPattern"
```

---

## Task 4: Two-tier permission resolution in the token authorizer

**Files:**

- Modify: `src/token-authorizer.ts`
- Modify: `test/suite/unit/token-auth/authorize-token-all-repos.spec.ts`

This task modifies `updatePermissions` in `src/token-authorizer.ts` to resolve
pattern-based permission keys against the requested permissions before applying
them. The tests use the all-repos path for simplicity, but the change applies to
all three authorization paths (all-repos, no-repos, selected-repos) because they
all share `updatePermissions`.

- [ ] **Step 1: Write the failing test — pattern-only rule**

Add to the end of
`test/suite/unit/token-auth/authorize-token-all-repos.spec.ts`:

```ts
it("allows tokens when permissions use a wildcard pattern", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: "role-a",
          account: "account-a",
          repos: "all",
          permissions: { contents: "write", metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have write, wanted read"
  `);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
`npm exec -- vitest --run test/suite/unit/token-auth/authorize-token-all-repos.spec.ts -t "wildcard pattern"`

Expected: FAIL — the `*` key is passed through literally and doesn't match
`contents` or `metadata`.

- [ ] **Step 3: Write additional failing tests**

Add all remaining test cases to the end of the same file:

```ts
it("allows literals to escalate above patterns within a single rule", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "read", contents: "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: "role-a",
          account: "account-a",
          repos: "all",
          permissions: { contents: "write", metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have write, wanted write
          ✅ metadata: have read, wanted read"
  `);
});

it("allows literals to de-escalate below patterns within a single rule", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write", contents: "none" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: "role-a",
          account: "account-a",
          repos: "all",
          permissions: { contents: "write", metadata: "read" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 1 rule:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have none, wanted write
          ✅ metadata: have write, wanted read"
  `);
});

it("uses the max access level when multiple patterns match", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "read", "secret_*": "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: "role-a",
          account: "account-a",
          repos: "all",
          permissions: {
            contents: "read",
            secret_scanning_alerts: "write",
          },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 1 rule:
        ✅ Rule #1 gave sufficient access:
          ✅ contents: have read, wanted read
          ✅ secret_scanning_alerts: have write, wanted write"
  `);
});

it("does not grant permissions when no patterns match", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "organization_*": "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: "role-a",
          account: "account-a",
          repos: "all",
          permissions: { contents: "write" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "❌ Account account-x was denied access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ❌ Insufficient access to all repos in account-a based on 0 rules:
        (no matching rules)"
  `);
});

it("allows a later pattern rule to override a literal rule", () => {
  const authorizer = createTokenAuthorizer({
    rules: [
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { contents: "read" },
      },
      {
        resources: [
          {
            accounts: ["account-a"],
            noRepos: false,
            allRepos: true,
            selectedRepos: [],
          },
        ],
        consumers: ["account-x"],
        permissions: { "*": "write" },
      },
    ],
  });

  expect(
    explain(
      authorizer.authorizeToken({
        consumer: { account: "account-x" },
        tokenDec: {
          shared: false,
          as: "role-a",
          account: "account-a",
          repos: "all",
          permissions: { contents: "write" },
        },
        repos: "all",
      }),
    ),
  ).toMatchInlineSnapshot(`
    "✅ Account account-x was allowed access to a token:
      ✅ Write access to all repos in account-a requested with role role-a
      ✅ Sufficient access to all repos in account-a based on 2 rules:
        ❌ Rule #1 gave insufficient access:
          ❌ contents: have read, wanted write
        ✅ Rule #2 gave sufficient access:
          ✅ contents: have write, wanted write"
  `);
});
```

- [ ] **Step 4: Implement two-tier permission resolution**

In `src/token-authorizer.ts`, make these changes:

1. Add `createNamePattern` import (already imported).

2. Add a type for compiled permission patterns alongside the existing
   `ResourceCriteriaPatterns`:

```ts
type PermissionPatterns = {
  literals: Map<string, PermissionAccess>;
  patterns: [Pattern, PermissionAccess][];
};
```

3. In `patternsForRules` and `patternsForRule`, also compile permission
   patterns. The return types grow to include `PermissionPatterns` per rule:

```ts
function patternsForRules(
  rules: PermissionsRule[],
): [
  Record<number, ResourceCriteriaPatterns[]>,
  Record<number, Pattern[]>,
  Record<number, PermissionPatterns>,
] {
  const resourcePatterns: Record<number, ResourceCriteriaPatterns[]> = {};
  const consumerPatterns: Record<number, Pattern[]> = {};
  const permPatterns: Record<number, PermissionPatterns> = {};

  for (let i = 0; i < rules.length; ++i) {
    [resourcePatterns[i], consumerPatterns[i], permPatterns[i]] =
      patternsForRule(rules[i]);
  }

  return [resourcePatterns, consumerPatterns, permPatterns];
}

function patternsForRule(
  rule: PermissionsRule,
): [
  resourcePatterns: ResourceCriteriaPatterns[],
  consumerPatterns: Pattern[],
  permissionPatterns: PermissionPatterns,
] {
  const resourcePatterns: ResourceCriteriaPatterns[] = [];
  const consumerPatterns: Pattern[] = [];
  const permissionPatterns: PermissionPatterns = {
    literals: new Map(),
    patterns: [],
  };

  for (const criteria of rule.resources) {
    resourcePatterns.push(patternsForResourceCriteria(criteria));
  }
  for (const consumer of rule.consumers) {
    consumerPatterns.push(createGitHubPattern(consumer));
  }
  for (const [name, access] of Object.entries(rule.permissions)) {
    if (access == null) continue;
    const pattern = createNamePattern(name);
    if (pattern.isLiteral) {
      permissionPatterns.literals.set(name, access);
    } else {
      permissionPatterns.patterns.push([pattern, access]);
    }
  }

  return [resourcePatterns, consumerPatterns, permissionPatterns];
}
```

4. Update the destructuring at the top of `createTokenAuthorizer` to capture the
   new `permissionPatterns`:

```ts
const [resourcePatterns, consumerPatterns, permissionPatterns] =
  patternsForRules(config.rules);
```

5. Replace `updatePermissions` with a new version that accepts
   `PermissionPatterns` and a `want` (requested permissions), resolves patterns,
   then applies:

```ts
function updatePermissions(
  have: Permissions,
  permPatterns: PermissionPatterns,
  want: Permissions,
): void {
  const resolved = resolvePermissions(permPatterns, want);
  Object.assign(have, resolved);

  for (const [permission, access = "none"] of Object.entries(have)) {
    if (access === "none") delete have[permission];
  }
}

function resolvePermissions(
  permPatterns: PermissionPatterns,
  want: Permissions,
): Permissions {
  const resolved: Permissions = {};

  for (const permission of Object.keys(want)) {
    // Tier 1: max of all matching patterns
    let maxPatternAccess: PermissionAccess | undefined;

    for (const [pattern, access] of permPatterns.patterns) {
      if (!pattern.test(permission)) continue;

      if (
        maxPatternAccess == null ||
        ACCESS_RANK[access] > ACCESS_RANK[maxPatternAccess]
      ) {
        maxPatternAccess = access;
      }
    }

    // Tier 2: literal unconditionally overrides
    const literalAccess = permPatterns.literals.get(permission);

    const finalAccess = literalAccess ?? maxPatternAccess;
    if (finalAccess != null) resolved[permission] = finalAccess;
  }

  return resolved;
}
```

6. Import `ACCESS_RANK` — it's currently defined in `src/access-level.ts` but
   not exported. You need to either export it or inline the ranking. The
   simplest approach: export `ACCESS_RANK` from `src/access-level.ts`:

```ts
// In src/access-level.ts, change `const` to `export const`:
export const ACCESS_RANK = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
} as const;
```

Then import it in `src/token-authorizer.ts`:

```ts
import { ACCESS_RANK, isWriteAccess, maxAccess } from "./access-level.js";
```

7. Update all three `updatePermissions` call sites (`authorizeAllRepos`,
   `authorizeNoRepos`, `authorizeSelectedRepos`) to pass the new arguments. Each
   currently reads:

```ts
updatePermissions(have, rule.permissions);
```

Change to:

```ts
updatePermissions(have, permissionPatterns[i], request.tokenDec.permissions);
```

Note: the `no-match` test also requires that a rule with no matching permissions
is treated as non-relevant. The current code adds a rule to `ruleResults`
whenever it's "relevant" (matching resources/consumers). With permission
patterns, a rule can match on resources/consumers but contribute zero
permissions. To handle this cleanly, after `updatePermissions`, check if the
resolved permissions changed `have`; if it contributed nothing, skip adding to
`ruleResults`. The simplest approach: have `updatePermissions` return a boolean
indicating whether any permission was resolved:

```ts
function updatePermissions(
  have: Permissions,
  permPatterns: PermissionPatterns,
  want: Permissions,
): boolean {
  const resolved = resolvePermissions(permPatterns, want);
  const hasResolved = Object.keys(resolved).length > 0;
  Object.assign(have, resolved);

  for (const [permission, access = "none"] of Object.entries(have)) {
    if (access === "none") delete have[permission];
  }

  return hasResolved;
}
```

Then in each authorization function, wrap the `ruleResults.push(...)` and
`isSufficient` update in a check:

```ts
if (
  !updatePermissions(have, permissionPatterns[i], request.tokenDec.permissions)
)
  continue;
```

- [ ] **Step 5: Run all tests**

Run: `make test`

Expected: All existing tests pass, plus the four new tests pass. The inline
snapshots for the new tests should match the expected output. If they don't
match, update the inline snapshots to reflect the actual output after verifying
correctness.

- [ ] **Step 6: Run lint**

Run: `make lint`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/access-level.ts src/token-authorizer.ts \
  test/suite/unit/token-auth/authorize-token-all-repos.spec.ts
git commit -m "feat: support permission name patterns in permissions rules

Implements #39. Permission keys in provider rules can now use glob
patterns (e.g. '*', 'secret_*'). Two-tier resolution: patterns set
a baseline via max-wins, literal names unconditionally override."
```
