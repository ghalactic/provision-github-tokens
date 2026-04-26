# Output and summary improvements implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add detailed explainers for token creation and provisioning phases,
and update the job summary to reflect actual provisioning outcomes instead of
just authorization decisions.

**Architecture:** New `token-creation-explainer/text.ts` and
`provisioning-explainer/text.ts` modules follow the existing explainer pattern.
They integrate into `token-factory.ts` and `provisioner.ts` respectively,
replacing count-based log summaries. `summary.ts` gains two new parameters for
token creation and provisioning results, uses them for the heading count and a
failure reason column.

**Tech Stack:** TypeScript, Vitest (inline snapshots + file snapshots),
`@actions/core` (info/debug/warning), mdast + mdast-util-gfm for summary
markdown.

---

## File map

| File                                              | Action        | Responsibility                                       |
| ------------------------------------------------- | ------------- | ---------------------------------------------------- |
| `src/type/token-creation-result.ts`               | Create        | `TokenCreationResultExplainer<T>` type               |
| `src/type/provisioning-result.ts`                 | Create        | `ProvisioningResultExplainer<T>` type                |
| `src/token-creation-explainer/text.ts`            | Create        | Text explainer for token creation results            |
| `src/provisioning-explainer/text.ts`              | Create        | Text explainer for provisioning results              |
| `src/token-factory.ts`                            | Modify        | Replace count summaries with explainer calls         |
| `src/provisioner.ts`                              | Modify        | Replace count summaries with explainer calls         |
| `src/summary.ts`                                  | Modify        | New params, heading logic, failure reason column     |
| `src/main.ts`                                     | Modify        | Pass token/provisioning results to `renderSummary()` |
| `test/suite/unit/token-factory.spec.ts`           | Modify        | Replace `.toEqual()` with explainer snapshots        |
| `test/suite/unit/provisioner/provisioner.spec.ts` | Modify        | Replace `.toEqual()` with explainer snapshots        |
| `test/suite/unit/summary.spec.ts`                 | Modify        | New params, new fixture cases                        |
| `test/fixture/summary/*.md`                       | Modify/Create | Updated and new fixture files                        |

---

### Task 1: Token creation explainer type

**Files:**

- Create: `src/type/token-creation-result.ts`

- [ ] **Step 1: Create the type file**

```ts
// src/type/token-creation-result.ts
import type { TokenCreationResult } from "../token-factory.js";
import type { TokenAuthResult } from "./token-auth-result.js";

export type TokenCreationResultExplainer<T> = (
  authResult: TokenAuthResult,
  creationResult: TokenCreationResult,
) => T;

export type TokenCreationResultExplainerFactory<T> = (
  results: Map<TokenAuthResult, TokenCreationResult>,
) => TokenCreationResultExplainer<T>;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/type/token-creation-result.ts
git commit -m "Add TokenCreationResultExplainer type"
```

---

### Task 2: Provisioning explainer type

**Files:**

- Create: `src/type/provisioning-result.ts`

- [ ] **Step 1: Create the type file**

```ts
// src/type/provisioning-result.ts
import type { ProvisioningResult } from "../provisioner.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./provision-auth-result.js";

export type ProvisioningResultExplainer<T> = (
  authResult: ProvisionAuthResult,
  targetResults: Map<ProvisionAuthTargetResult, ProvisioningResult>,
) => T;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/type/provisioning-result.ts
git commit -m "Add ProvisioningResultExplainer type"
```

---

### Task 3: Token creation text explainer

**Files:**

- Create: `src/token-creation-explainer/text.ts`

This module renders human-readable text for each token creation result. The
factory receives the full results map to precompute deduplication
backreferences.

The explainer follows the pattern in `src/token-auth-explainer/text.ts` and
`src/provision-auth-explainer/text.ts`.

- [ ] **Step 1: Create the text explainer**

```ts
// src/token-creation-explainer/text.ts
import { debug } from "@actions/core";
import { errorMessage, errorStack } from "../error.js";
import { accountOrRepoRefToString } from "../github-reference.js";
import type { TokenCreationResult } from "../token-factory.js";
import type {
  TokenCreationResultExplainer,
  TokenCreationResultExplainerFactory,
} from "../type/token-creation-result.js";
import type { TokenAuthResult } from "../type/token-auth-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextTokenCreationExplainer(
  results: Map<TokenAuthResult, TokenCreationResult>,
): TokenCreationResultExplainer<string> {
  // Precompute backreferences for deduplicated tokens.
  // Multiple auth results can share the same TokenCreationResult object
  // reference when caching kicks in. Map each result object to the index
  // of the first auth result that produced it.
  const firstIndex = new Map<TokenCreationResult, number>();
  let i = 0;
  for (const [, result] of results) {
    if (!firstIndex.has(result)) {
      firstIndex.set(result, i);
    }
    ++i;
  }

  return (authResult, creationResult) => {
    const currentIndex = [...results.keys()].indexOf(authResult);
    const first = firstIndex.get(creationResult);

    // If this result was already explained under a different entry, backreference it
    if (first !== undefined && first !== currentIndex) {
      return `${renderIcon(creationResult.type === "CREATED")} Same token as #${first + 1}`;
    }

    return explainResult(authResult, creationResult);
  };

  function explainResult(
    authResult: TokenAuthResult,
    result: TokenCreationResult,
  ): string {
    const account = authResult.request.tokenDec.account;

    switch (result.type) {
      case "CREATED":
        return `${ALLOWED_ICON} Token created for ${account}`;

      case "NOT_ALLOWED":
        return `${DENIED_ICON} Token not allowed`;

      case "NO_ISSUER":
        return `${DENIED_ICON} No suitable issuer app`;

      case "REQUEST_ERROR": {
        const summary = `${DENIED_ICON} Failed to create token: ${result.error.status}: ${result.error.message}`;

        if (result.error.response?.data) {
          const body = JSON.stringify(result.error.response.data, null, 2);
          debugMultiLine("  ", body);
        }

        return summary;
      }

      case "ERROR": {
        const summary = `${DENIED_ICON} Failed to create token: ${errorMessage(result.error)}`;
        const stack = errorStack(result.error);
        debugMultiLine("  ", stack);

        return summary;
      }
    }
  }
}

function debugMultiLine(indent: string, text: string): void {
  for (const line of text.split("\n")) {
    debug(`${indent}${line}`);
  }
}

function renderIcon(isAllowed: boolean): string {
  return isAllowed ? ALLOWED_ICON : DENIED_ICON;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/token-creation-explainer/text.ts
git commit -m "Add text explainer for token creation results"
```

---

### Task 4: Provisioning text explainer

**Files:**

- Create: `src/provisioning-explainer/text.ts`

This module renders human-readable text for each provisioning result. The output
is structured at the secret level with target sub-entries. It follows the same
pattern as the provision auth explainer in
`src/provision-auth-explainer/text.ts`.

- [ ] **Step 1: Create the text explainer**

```ts
// src/provisioning-explainer/text.ts
import { debug } from "@actions/core";
import { accountOrRepoRefToString } from "../github-reference.js";
import { errorMessage, errorStack } from "../error.js";
import type { ProvisionRequestTarget } from "../provision-request.js";
import type { ProvisioningResult } from "../provisioner.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "../type/provision-auth-result.js";
import type { ProvisioningResultExplainer } from "../type/provisioning-result.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function createTextProvisioningExplainer(): ProvisioningResultExplainer<string> {
  return (authResult, targetResults) => {
    const name = authResult.request.name;
    const requester = `${authResult.request.requester.account}/${authResult.request.requester.repo}`;
    const allProvisioned = [...targetResults.values()].every(
      (r) => r.type === "PROVISIONED",
    );

    let output =
      `${renderIcon(allProvisioned)} Repo ${requester} ` +
      `${allProvisioned ? "provisioned" : "didn't fully provision"} ` +
      `secret ${name}:`;

    for (const [targetAuth, result] of targetResults) {
      output += explainTarget(targetAuth.target, result);
    }

    return output;
  };

  function explainTarget(
    target: ProvisionRequestTarget,
    result: ProvisioningResult,
  ): string {
    const subject = explainSubject(target);

    switch (result.type) {
      case "PROVISIONED":
        return `\n  ${ALLOWED_ICON} Provisioned to ${subject}`;

      case "NOT_ALLOWED":
        return `\n  ${DENIED_ICON} Not allowed`;

      case "NO_TOKEN":
        return `\n  ${DENIED_ICON} Token wasn't created`;

      case "NO_PROVISIONER":
        return `\n  ${DENIED_ICON} No suitable provisioner app`;

      case "REQUEST_ERROR": {
        const line = `\n  ${DENIED_ICON} Failed to provision: ${result.error.status}: ${result.error.message}`;

        if (result.error.response?.data) {
          const body = JSON.stringify(result.error.response.data, null, 2);
          debugMultiLine("    ", body);
        }

        return line;
      }

      case "ERROR": {
        const line = `\n  ${DENIED_ICON} Failed to provision: ${errorMessage(result.error)}`;
        const stack = errorStack(result.error);
        debugMultiLine("    ", stack);

        return line;
      }
    }
  }

  function explainSubject(target: ProvisionRequestTarget): string {
    const type = ((r) => {
      const type = r.type;

      switch (type) {
        case "actions":
          return "GitHub Actions";
        case "codespaces":
          return "GitHub Codespaces";
        case "dependabot":
          return "Dependabot";
        case "environment":
          return `GitHub environment ${r.target.environment}`;
      }

      /* istanbul ignore next - @preserve */
      throw new Error(
        `Invariant violation: Unexpected secret type ${JSON.stringify(type)}`,
      );
    })(target);

    return `${type} secret in ${accountOrRepoRefToString(target.target)}`;
  }
}

function debugMultiLine(indent: string, text: string): void {
  for (const line of text.split("\n")) {
    debug(`${indent}${line}`);
  }
}

function renderIcon(isAllowed: boolean): string {
  return isAllowed ? ALLOWED_ICON : DENIED_ICON;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/provisioning-explainer/text.ts
git commit -m "Add text explainer for provisioning results"
```

---

### Task 5: Integrate token creation explainer into token-factory.ts

**Files:**

- Modify: `src/token-factory.ts:1-2,93-138`

Replace the count-based `info()` calls at lines 93–138 with explainer output.
Add `debug` and `warning` imports.

- [ ] **Step 1: Update imports (line 1)**

Replace:

```ts
import { info } from "@actions/core";
```

With:

```ts
import { info, warning } from "@actions/core";
```

- [ ] **Step 2: Add explainer import after existing imports (after line 8)**

Add:

```ts
import { createTextTokenCreationExplainer } from "./token-creation-explainer/text.js";
```

- [ ] **Step 3: Replace count summary with explainer output**

Replace lines 93–138 (everything from `let createdCount = 0;` through the
closing `info` calls, up to `return creationResults;`):

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
    if (cache[key].type === "CREATED") ++uniqueCreatedCount;
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

With:

```ts
const explain = createTextTokenCreationExplainer(creationResults);

if (creationResults.size > 0) {
  let i = 0;
  for (const [authResult, creationResult] of creationResults) {
    ++i;
    info(`\nToken #${i}:\n`);
    info(explain(authResult, creationResult));
  }
} else {
  info("");
  warning("❌ No tokens were created");
}
```

- [ ] **Step 4: Remove unused `pluralize` import**

The `pluralize` import on line 5 is no longer used. Remove it:

```ts
import { pluralize } from "./pluralize.js";
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 6: Commit**

```
git add src/token-factory.ts
git commit -m "Integrate token creation explainer into token factory"
```

---

### Task 6: Integrate provisioning explainer into provisioner.ts

**Files:**

- Modify: `src/provisioner.ts:1,149-175`

Replace the count-based `info()` calls at lines 149–175 with explainer output.
Add `warning` import.

- [ ] **Step 1: Update imports (line 1)**

Replace:

```ts
import { info } from "@actions/core";
```

With:

```ts
import { info, warning } from "@actions/core";
```

- [ ] **Step 2: Add explainer import after existing imports (after line 14)**

Add:

```ts
import { createTextProvisioningExplainer } from "./provisioning-explainer/text.js";
```

- [ ] **Step 3: Replace count summary with explainer output**

Replace lines 149–175 (everything from `let provisionedCount = 0;` through the
closing `info` calls, up to `return provisionResults;`):

```ts
let provisionedCount = 0;
let notProvisionedCount = 0;

for (const result of provisionResults.values()) {
  for (const targetResult of result.values()) {
    if (targetResult.type === "PROVISIONED") {
      ++provisionedCount;
    } else {
      ++notProvisionedCount;
    }
  }
}

if (provisionedCount > 0) {
  info(`Provisioned ${pluralize(provisionedCount, "secret", "secrets")}`);
}
if (notProvisionedCount > 0) {
  const pluralized = pluralize(
    notProvisionedCount,
    "requested secret wasn't",
    "requested secrets weren't",
  );
  info(`${pluralized} provisioned`);
}
```

With:

```ts
const explain = createTextProvisioningExplainer();

if (provisionResults.size > 0) {
  let i = 0;
  for (const [authResult, targetResults] of provisionResults) {
    ++i;
    info(`\nSecret #${i}:\n`);
    info(explain(authResult, targetResults));
  }
} else {
  info("");
  warning("❌ No secrets were provisioned");
}
```

- [ ] **Step 4: Remove unused `pluralize` import**

The `pluralize` import on line 6 is no longer used. Remove it:

```ts
import { pluralize } from "./pluralize.js";
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 6: Commit**

```
git add src/provisioner.ts
git commit -m "Integrate provisioning explainer into provisioner"
```

---

### Task 7: Update summary.ts

**Files:**

- Modify: `src/summary.ts`

Add new parameters for token creation and provisioning results. Update the
heading to count based on actual provisioning outcomes. Add a Reason column to
the failures table.

- [ ] **Step 1: Add imports**

Add these imports at the top of `src/summary.ts`:

```ts
import type { ProvisioningResult } from "./provisioner.js";
import type { TokenCreationResult } from "./token-factory.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
```

- [ ] **Step 2: Update the `renderSummary` signature and body**

Change the `renderSummary` function signature and the internal logic. The full
replacement for `renderSummary`:

```ts
export function renderSummary(
  githubServerUrl: string,
  actionUrl: string,
  authResult: AuthorizeResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): string {
  const { provisionResults: authResults } = authResult;
  const allDenied = authResults.filter(
    (r) => !isFullyProvisioned(r, provisionResults),
  );
  const allAllowed = authResults.filter((r) =>
    isFullyProvisioned(r, provisionResults),
  );

  const denied = allDenied.slice(0, MAX_ROWS);
  const remaining = Math.max(0, MAX_ROWS - denied.length);
  const allowed = allAllowed.slice(0, remaining);
  const displayed = [...denied, ...allowed];

  const omitted =
    allDenied.length - denied.length + (allAllowed.length - allowed.length);

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(authResults, provisionResults),
        ...emptySection(authResults, authResult, actionUrl),
        ...failuresTable(denied, tokens, provisionResults),
        ...successesTable(allowed),
        ...omittedNotice(authResults.length, omitted),
        ...definitions(githubServerUrl, displayed),
      ],
    },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}
```

- [ ] **Step 3: Update `statsHeading` to use provisioning outcomes**

```ts
function statsHeading(
  authResults: ProvisionAuthResult[],
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): RootContent {
  const total = authResults.length;
  const allowed = authResults.filter((r) =>
    isFullyProvisioned(r, provisionResults),
  ).length;

  const headingText =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  return heading(3, text(headingText));
}
```

- [ ] **Step 4: Update `failuresTable` to include Reason column**

```ts
function failuresTable(
  denied: ProvisionAuthResult[],
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): RootContent[] {
  if (denied.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left", "left"],
      [
        [],
        [text("Requester")],
        [text("Secret")],
        [text("Targets")],
        [text("Reason")],
      ],
      denied.map((r) => failureRow(r, tokens, provisionResults)),
    ),
  ];
}
```

- [ ] **Step 5: Add `failureRow` and `failureReason` functions**

Add these new functions (unexported, below the exported `renderSummary`):

```ts
function failureRow(
  result: ProvisionAuthResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): TableCell["children"][] {
  return [
    [text(renderIcon(false))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to),
    [text(failureReason(result, tokens, provisionResults))],
  ];
}

function failureReason(
  authResult: ProvisionAuthResult,
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): string {
  // Priority 1: Secret not allowed (provision auth denied the whole secret)
  if (!authResult.isAllowed) return "Secret not allowed";

  // Priority 2: Token not allowed
  for (const targetAuth of authResult.results) {
    if (!targetAuth.isTokenAllowed) return "Token not allowed";
  }

  // Priority 3-4: Token creation failures
  for (const targetAuth of authResult.results) {
    if (!targetAuth.tokenAuthResult) continue;

    const tokenResult = tokens.get(targetAuth.tokenAuthResult);
    if (!tokenResult) continue;

    if (tokenResult.type === "NO_ISSUER") return "No suitable issuer";
    if (tokenResult.type === "REQUEST_ERROR" || tokenResult.type === "ERROR") {
      return "Failed to issue token";
    }
  }

  // Priority 5-7: Provisioning failures
  const targetResults = provisionResults.get(authResult);
  if (targetResults) {
    let provisionedCount = 0;
    let failedCount = 0;
    let hasNoProvisioner = false;

    for (const result of targetResults.values()) {
      if (result.type === "PROVISIONED") {
        ++provisionedCount;
      } else {
        ++failedCount;
        if (result.type === "NO_PROVISIONER") hasNoProvisioner = true;
      }
    }

    if (hasNoProvisioner && failedCount === targetResults.size) {
      return "No suitable provisioner";
    }

    if (provisionedCount > 0 && failedCount > 0) {
      return "Failed to provision to some targets";
    }

    return "Failed to provision";
  }

  return "Failed to provision";
}
```

- [ ] **Step 6: Add `isFullyProvisioned` helper**

Add this unexported helper function:

```ts
function isFullyProvisioned(
  authResult: ProvisionAuthResult,
  provisionResults: Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >,
): boolean {
  const targetResults = provisionResults.get(authResult);
  if (!targetResults || targetResults.size === 0) return false;

  for (const result of targetResults.values()) {
    if (result.type !== "PROVISIONED") return false;
  }

  return true;
}
```

- [ ] **Step 7: Update the `secretRow` function rename**

The existing `secretRow` function is now only used by the successes table.
Rename it to clarify. Also update `successesTable` to call it:

```ts
function successesTable(allowed: ProvisionAuthResult[]): RootContent[] {
  if (allowed.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      allowed.map((r) => successRow(r)),
    ),
  ];
}

function successRow(result: ProvisionAuthResult): TableCell["children"][] {
  return [
    [text(renderIcon(true))],
    [accountOrRepoLinkRef(result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(result.request.to),
  ];
}
```

- [ ] **Step 8: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 9: Commit**

```
git add src/summary.ts
git commit -m "Update summary with provisioning outcomes and failure reasons"
```

---

### Task 8: Update main.ts

**Files:**

- Modify: `src/main.ts:118-128`

Capture the return values from `createTokens()` and `provisionSecrets()` and
pass them to `renderSummary()`.

- [ ] **Step 1: Capture return values and update renderSummary call**

Replace lines 118–128:

```ts
const tokens = await group("Creating tokens", async () => {
  return await createTokens(tokenAuthorizer.listResults());
});

await group("Provisioning secrets", async () => {
  await provisionSecrets(tokens, provisionAuthorizer.listResults());
});

await summary
  .addRaw(renderSummary(githubServerUrl, actionUrl, authorizeResult))
  .write();
```

With:

```ts
const tokens = await group("Creating tokens", async () => {
  return await createTokens(tokenAuthorizer.listResults());
});

const provisioningResults = await group("Provisioning secrets", async () => {
  return await provisionSecrets(tokens, provisionAuthorizer.listResults());
});

await summary
  .addRaw(
    renderSummary(
      githubServerUrl,
      actionUrl,
      authorizeResult,
      tokens,
      provisioningResults,
    ),
  )
  .write();
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit` Expected: No errors

- [ ] **Step 3: Commit**

```
git add src/main.ts
git commit -m "Pass token and provisioning results to renderSummary"
```

---

### Task 9: Update token-factory tests with explainer snapshots

**Files:**

- Modify: `test/suite/unit/token-factory.spec.ts`

Replace `.toEqual()` assertions on token creation result arrays with inline
snapshot assertions on explainer output. The explainer is already called inside
`createTokenFactory`, so the output is captured by the mocked `@actions/core`
`info` calls.

Use `__getOutput("info")` (or the equivalent mock capture) to read the logged
explainer text and snapshot it.

- [ ] **Step 1: Study the existing test assertions**

Read through `test/suite/unit/token-factory.spec.ts` fully. Each test currently
creates token auth results, calls `createTokens()`, then asserts on the returned
map entries with `.toEqual()`.

The new explainer is called inside `createTokenFactory` and logs via `info()`.
The mock at `__mocks__/@actions/core.ts` captures these calls. Use
`__getOutput("info")` to retrieve the logged explainer text.

- [ ] **Step 2: For each test, add an explainer snapshot assertion**

After the existing `expect(...).toEqual(...)` call in each test, add:

```ts
expect(__getOutput("info")).toMatchInlineSnapshot(`...`);
```

Run the test once with an empty inline snapshot to let Vitest fill it in:

```
npm exec -- vitest --run test/suite/unit/token-factory.spec.ts -u
```

Review the generated snapshots to verify they look correct — check that:

- `CREATED` results show "✅ Token created for \<account\>"
- `NOT_ALLOWED` shows "❌ Token not allowed"
- `NO_ISSUER` shows "❌ No suitable issuer app"
- `REQUEST_ERROR` shows status and message
- `ERROR` shows the error message
- Deduplicated tokens show "Same token as #N"

- [ ] **Step 3: Replace low-level assertions where possible**

Where the `.toEqual()` assertion only checks result types and the explainer
snapshot captures the same information, remove the `.toEqual()` assertion.

Where the `.toEqual()` assertion checks something the explainer doesn't capture
(e.g., the actual token string value for downstream use), leave it with a
`// FIXME:` comment explaining what needs follow-up.

- [ ] **Step 4: Verify all tests pass**

Run: `npm exec -- vitest --run test/suite/unit/token-factory.spec.ts` Expected:
All tests pass

- [ ] **Step 5: Commit**

```
git add test/suite/unit/token-factory.spec.ts
git commit -m "Replace token factory result assertions with explainer snapshots"
```

---

### Task 10: Update provisioner tests with explainer snapshots

**Files:**

- Modify: `test/suite/unit/provisioner/provisioner.spec.ts`

Same approach as Task 9. The provisioner already calls the explainer internally,
logging via `info()`. Replace `.toEqual()` assertions on
`provisionResultsToArray()` with inline snapshot assertions on the captured
explainer output.

- [ ] **Step 1: Study the existing test assertions**

Read through `test/suite/unit/provisioner/provisioner.spec.ts` fully. Tests use
`provisionResultsToArray()` to convert the nested map into an assertable array,
then call `.toEqual()` with expected result types.

- [ ] **Step 2: For each test, add an explainer snapshot assertion**

After the existing `expect(...).toEqual(...)` call in each test, add:

```ts
expect(__getOutput("info")).toMatchInlineSnapshot(`...`);
```

Run the test once with an empty inline snapshot to let Vitest fill it in:

```
npm exec -- vitest --run test/suite/unit/provisioner/provisioner.spec.ts -u
```

Review the generated snapshots to verify they look correct — check that:

- `PROVISIONED` results show "✅ Provisioned to \<type\> secret in \<target\>"
- `NOT_ALLOWED` shows "❌ Not allowed"
- `NO_TOKEN` shows "❌ Token wasn't created"
- `NO_PROVISIONER` shows "❌ No suitable provisioner app"
- `REQUEST_ERROR` shows status and message
- Error cases show error messages

- [ ] **Step 3: Replace low-level assertions where possible**

Where `.toEqual()` only checks result types and the explainer snapshot captures
the same information, remove the `.toEqual()` assertion.

Where it checks something else (e.g., `__getOrgSecrets()` for verifying actual
API calls were made), keep those — they test side effects the explainer can't
capture.

Where a low-level assertion can't be straightforwardly replaced, leave it with a
`// FIXME:` comment.

- [ ] **Step 4: Verify all tests pass**

Run: `npm exec -- vitest --run test/suite/unit/provisioner/provisioner.spec.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```
git add test/suite/unit/provisioner/provisioner.spec.ts
git commit -m "Replace provisioner result assertions with explainer snapshots"
```

---

### Task 11: Update summary tests

**Files:**

- Modify: `test/suite/unit/summary.spec.ts`
- Modify: `test/fixture/summary/*.md` (existing fixtures will be auto-updated)
- Create: new fixture files for new test cases

The summary tests need to produce token creation and provisioning result maps to
pass to `renderSummary()`. All existing test cases need updated calls.

- [ ] **Step 1: Add imports**

Add to the imports in `test/suite/unit/summary.spec.ts`:

```ts
import type { TokenCreationResult } from "../../../src/token-factory.js";
import type { ProvisioningResult } from "../../../src/provisioner.js";
import type { ProvisionAuthTargetResult } from "../../../src/type/provision-auth-result.js";
import type { TokenAuthResult } from "../../../src/type/token-auth-result.js";
```

- [ ] **Step 2: Create helper to build provisioning results from auth results**

Add a helper function at the top of the test file (after imports) that creates
"all provisioned" provisioning results from auth results, since most existing
tests assumed all-allowed means all-provisioned:

```ts
function createAllProvisionedResults(
  authResults: ProvisionAuthResult[],
): Map<
  ProvisionAuthResult,
  Map<ProvisionAuthTargetResult, ProvisioningResult>
> {
  const results = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const auth of authResults) {
    const targetMap = new Map<ProvisionAuthTargetResult, ProvisioningResult>();
    for (const targetAuth of auth.results) {
      targetMap.set(targetAuth, { type: "PROVISIONED" });
    }
    results.set(auth, targetMap);
  }

  return results;
}

function createAllNotAllowedResults(
  authResults: ProvisionAuthResult[],
): Map<
  ProvisionAuthResult,
  Map<ProvisionAuthTargetResult, ProvisioningResult>
> {
  const results = new Map<
    ProvisionAuthResult,
    Map<ProvisionAuthTargetResult, ProvisioningResult>
  >();

  for (const auth of authResults) {
    const targetMap = new Map<ProvisionAuthTargetResult, ProvisioningResult>();
    for (const targetAuth of auth.results) {
      targetMap.set(targetAuth, { type: "NOT_ALLOWED" });
    }
    results.set(auth, targetMap);
  }

  return results;
}

const emptyTokens = new Map<TokenAuthResult, TokenCreationResult>();
```

- [ ] **Step 3: Update all existing test cases**

Each test currently calls:

```ts
renderSummary(githubServerUrl, testDocsUrl, {
  provisionResults,
  tokenResults: [],
});
```

Update to:

```ts
renderSummary(
  githubServerUrl,
  testDocsUrl,
  { provisionResults, tokenResults: [] },
  emptyTokens,
  createAllProvisionedResults(provisionResults), // or createAllNotAllowedResults for denied tests
);
```

For the "all-denied" and "some-denied" tests, use `createAllNotAllowedResults`
for the denied entries. You'll need to split the auth results into allowed and
denied, and build appropriate provisioning result maps for each.

- [ ] **Step 4: Update fixture files**

Run the tests with update flag to regenerate fixtures:

```
npm exec -- vitest --run test/suite/unit/summary.spec.ts -u
```

Review the changes to each fixture file:

- `all-provisioned.md` — should be unchanged (all success, no reason column)
- `all-denied.md` — should now have a Reason column with "Secret not allowed"
- `some-denied.md` — failures table should have a Reason column, successes table
  unchanged
- Other fixtures — review for correctness

- [ ] **Step 5: Add new test cases for token creation and provisioning
      failures**

Add test cases covering:

1. **NO_ISSUER** — auth allowed, but token creation has `NO_ISSUER`. Expected
   reason: "No suitable issuer"
2. **Failed to issue token** — auth allowed, token creation has `REQUEST_ERROR`.
   Expected reason: "Failed to issue token"
3. **NO_PROVISIONER** — auth allowed, token created, but provisioning has
   `NO_PROVISIONER`. Expected reason: "No suitable provisioner"
4. **Failed to provision** — auth allowed, token created, provisioning has
   `REQUEST_ERROR` for all targets. Expected reason: "Failed to provision"
5. **Partial failure** — auth allowed, token created, some targets
   `PROVISIONED`, some `REQUEST_ERROR`. Expected reason: "Failed to provision to
   some targets"

Each test builds the appropriate token creation and provisioning result maps
manually and passes them to `renderSummary()`.

- [ ] **Step 6: Create fixture files for new test cases**

Run:

```
npm exec -- vitest --run test/suite/unit/summary.spec.ts -u
```

Review each new fixture file for correctness.

- [ ] **Step 7: Verify all tests pass**

Run: `npm exec -- vitest --run test/suite/unit/summary.spec.ts` Expected: All
tests pass

- [ ] **Step 8: Commit**

```
git add test/suite/unit/summary.spec.ts test/fixture/summary/
git commit -m "Update summary tests for provisioning outcomes and failure reasons"
```

---

### Task 12: Final validation

- [ ] **Step 1: Regenerate all generated files**

Run: `make regenerate` Expected: `dist/main.js` and `dist/main.js.map` are
updated

- [ ] **Step 2: Stage generated files**

Run: `git add dist/`

- [ ] **Step 3: Run full precommit check**

Run: `make precommit` Expected: All checks pass (lint, test, verify-generated)

- [ ] **Step 4: Commit generated files**

```
git add dist/
git commit -m "Regenerate dist bundle"
```

- [ ] **Step 5: Verify coverage**

Run: `make coverage` Expected: 100% coverage. If any new branches are genuinely
unreachable, add `/* istanbul ignore next - @preserve */` with a descriptive
comment.
