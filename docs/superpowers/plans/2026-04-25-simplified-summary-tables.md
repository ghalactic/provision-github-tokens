# Simplified summary tables implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the verbose job summary output with a simple table-based
layout to stay well under the 1 MB GitHub Actions summary limit.

**Architecture:** Rewrite `src/summary.ts` to produce two GFM tables (failures
and successes) built from mdast `Table` nodes. Remove the markdown authorization
explainers, heading factory, and all associated dependencies. Keep the
mdast-based approach with `toMarkdown` + `gfmToMarkdown()`.

**Tech Stack:** mdast, mdast-util-gfm, mdast-util-to-markdown, TypeScript

---

## File structure

### Modified files

- `src/markdown.ts` — remove heading factory, anchor links, hast helpers; add
  `heading()` and `table()` helpers
- `src/summary.ts` — complete rewrite to table-based output
- `src/main.ts` — simplify `renderSummary` call (remove heading factory,
  slugger)
- `test/suite/unit/summary.spec.ts` — rewrite tests for new output
- All snapshot fixtures under `test/fixture/summary/` — regenerated

### Deleted files

- `src/token-auth-explainer/markdown.ts`
- `src/provision-auth-explainer/markdown.ts`
- `test/suite/unit/token-auth-explainer/markdown.spec.ts`
- `test/suite/unit/provision-auth-explainer/markdown.spec.ts`
- All fixtures under `test/fixture/token-auth-explainer/`
- All fixtures under `test/fixture/provision-auth-explainer/`
- `src/type/token-heading-reference.ts`

### Dependencies removed

- `github-slugger` (production)
- `hast-util-to-html` (production)
- `@types/hast` (dev)

---

### Task 1: Delete markdown explainers and their tests

**Files:**

- Delete: `src/token-auth-explainer/markdown.ts`
- Delete: `src/provision-auth-explainer/markdown.ts`
- Delete: `test/suite/unit/token-auth-explainer/markdown.spec.ts`
- Delete: `test/suite/unit/provision-auth-explainer/markdown.spec.ts`
- Delete: all files under `test/fixture/token-auth-explainer/`
- Delete: all files under `test/fixture/provision-auth-explainer/`
- Delete: `src/type/token-heading-reference.ts`

- [ ] **Step 1: Delete the files**

```bash
rm src/token-auth-explainer/markdown.ts
rm src/provision-auth-explainer/markdown.ts
rm test/suite/unit/token-auth-explainer/markdown.spec.ts
rm test/suite/unit/provision-auth-explainer/markdown.spec.ts
rm -rf test/fixture/token-auth-explainer
rm -rf test/fixture/provision-auth-explainer
rm src/type/token-heading-reference.ts
```

Check whether the `src/token-auth-explainer/` and
`test/suite/unit/token-auth-explainer/` directories are now empty (same for
`provision-auth-explainer`). If so, delete them too. If they still contain the
`text.ts` explainer or its tests, leave them.

- [ ] **Step 2: Verify the remaining tests still pass**

Run: `npm exec -- vitest --run`

Expected: The deleted test files no longer run. Other tests will fail because
`src/summary.ts` still imports the deleted files — that is expected and will be
fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Delete markdown auth explainers and fixtures"
```

---

### Task 2: Remove unused dependencies

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json` (via npm)

- [ ] **Step 1: Uninstall the dependencies**

```bash
npm uninstall github-slugger hast-util-to-html
npm uninstall --save-dev @types/hast
```

If `@types/github-slugger` exists in devDependencies, also remove it:

```bash
npm uninstall --save-dev @types/github-slugger
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "Remove unused summary dependencies"
```

---

### Task 3: Rewrite markdown helpers

**Files:**

- Modify: `src/markdown.ts`

- [ ] **Step 1: Rewrite `src/markdown.ts`**

Replace the entire file with the following content. This removes the heading
factory, anchor links, hast helpers, and all hast/slugger/crypto imports. It
adds the `heading()` and `table()` helpers.

```ts
import type {
  AlignType,
  Emphasis,
  Heading,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";
import {
  accountOrRepoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";

const ALLOWED_ICON = "✅";
const DENIED_ICON = "❌";

export function accountOrRepoLink(
  githubServerURL: string,
  accountOrRepo: AccountOrRepoReference,
): Link {
  const slug = accountOrRepoRefToString(accountOrRepo);

  return link(new URL(slug, githubServerURL), text(slug));
}

export function emphasis(...children: Emphasis["children"]): Emphasis {
  return { type: "emphasis", children };
}

export function heading(
  depth: Heading["depth"],
  ...children: Heading["children"]
): Heading {
  return { type: "heading", depth, children };
}

export function inlineCode(code: string): InlineCode {
  return { type: "inlineCode", value: code };
}

export function link(url: string | URL, ...children: Link["children"]): Link {
  return { type: "link", url: url.toString(), children };
}

export function listItem(
  ...children: (ListItem["children"][number] | undefined)[]
): ListItem {
  const definedChildren: ListItem["children"] = [];
  for (const c of children) if (c) definedChildren.push(c);

  return {
    type: "listItem",
    spread: false,
    children: definedChildren,
  };
}

export function paragraph(...children: Paragraph["children"]): Paragraph {
  return { type: "paragraph", children };
}

export function renderIcon(isAllowed: boolean): string {
  return isAllowed ? ALLOWED_ICON : DENIED_ICON;
}

export function table(
  align: AlignType[] | undefined,
  headings: TableCell["children"][],
  rows: TableCell["children"][][],
): Table {
  return {
    type: "table",
    align,
    children: [
      {
        type: "tableRow",
        children: headings.map(
          (children): TableCell => ({ type: "tableCell", children }),
        ),
      },
      ...rows.map(
        (row): TableRow => ({
          type: "tableRow",
          children: row.map(
            (children): TableCell => ({ type: "tableCell", children }),
          ),
        }),
      ),
    ],
  };
}

export function text(value: string): Text {
  return { type: "text", value };
}

export function unorderedList(...children: ListItem[]): List {
  return { type: "list", ordered: false, spread: false, children };
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit`

Expected: Errors in `src/summary.ts` and `src/main.ts` because they still
reference the old heading factory — those are expected. No errors in
`src/markdown.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/markdown.ts
git commit -m "Rewrite markdown helpers for table-based summary"
```

---

### Task 4: Rewrite summary module

**Files:**

- Modify: `src/summary.ts`

- [ ] **Step 1: Rewrite `src/summary.ts`**

Replace the entire file with the following content:

```ts
import type { RootContent, TableCell } from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import type { AuthorizeResult } from "./authorizer.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import {
  accountOrRepoRefToString,
  repoRefToString,
  type AccountOrRepoReference,
} from "./github-reference.js";
import {
  accountOrRepoLink,
  emphasis,
  heading,
  inlineCode,
  link,
  paragraph,
  renderIcon,
  table,
  text,
} from "./markdown.js";
import { pluralize } from "./pluralize.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { ProvisionRequestTarget } from "./provision-request.js";

export function renderSummary(
  githubServerURL: string,
  actionURL: string,
  result: AuthorizeResult,
): string {
  const provisionResults = result.provisionResults.toSorted((a, b) =>
    compareProvisionRequest(a.request, b.request),
  );

  const allowed = provisionResults.filter((r) => r.isAllowed);
  const denied = provisionResults.filter((r) => !r.isAllowed);

  return toMarkdown(
    {
      type: "root",
      children: [
        statsHeading(provisionResults),
        ...emptySection(provisionResults, result, actionURL),
        ...failuresTable(githubServerURL, denied),
        ...successesTable(githubServerURL, allowed),
      ],
    },
    { bullet: "-", extensions: [gfmToMarkdown()] },
  );
}

function statsHeading(provisionResults: ProvisionAuthResult[]): RootContent {
  const total = provisionResults.length;
  const allowed = provisionResults.filter((r) => r.isAllowed).length;

  const headingText =
    allowed === total
      ? `Provisioned ${pluralize(total, "secret", "secrets")}`
      : `Provisioned ${allowed} of ${pluralize(total, "secret", "secrets")}`;

  return heading(2, text(headingText));
}

function emptySection(
  provisionResults: ProvisionAuthResult[],
  result: AuthorizeResult,
  actionURL: string,
): RootContent[] {
  if (provisionResults.length > 0 || result.tokenResults.length > 0) return [];

  return [
    paragraph(emphasis(text("(no secrets provisioned)"))),
    paragraph(
      text("Need help getting started? See the "),
      link(new URL("#readme", actionURL), text("docs")),
      text("."),
    ),
  ];
}

function failuresTable(
  githubServerURL: string,
  denied: ProvisionAuthResult[],
): RootContent[] {
  if (denied.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      denied.map((r) => secretRow(githubServerURL, r)),
    ),
  ];
}

function successesTable(
  githubServerURL: string,
  allowed: ProvisionAuthResult[],
): RootContent[] {
  if (allowed.length === 0) return [];

  return [
    table(
      ["left", "left", "left", "left"],
      [[], [text("Requester")], [text("Secret")], [text("Targets")]],
      allowed.map((r) => secretRow(githubServerURL, r)),
    ),
  ];
}

function secretRow(
  githubServerURL: string,
  result: ProvisionAuthResult,
): TableCell["children"][] {
  return [
    [text(renderIcon(result.isAllowed))],
    [accountOrRepoLink(githubServerURL, result.request.requester)],
    [inlineCode(result.request.name)],
    targetCellChildren(githubServerURL, result.request.to),
  ];
}

function targetCellChildren(
  githubServerURL: string,
  targets: ProvisionRequestTarget[],
): TableCell["children"] {
  const seen = new Set<string>();
  const refs: AccountOrRepoReference[] = [];

  for (const t of targets) {
    const key = accountOrRepoRefToString(t.target);

    if (!seen.has(key)) {
      seen.add(key);
      refs.push(t.target);
    }
  }

  refs.sort((a, b) =>
    accountOrRepoRefToString(a).localeCompare(accountOrRepoRefToString(b)),
  );

  const children: TableCell["children"] = [];

  for (let i = 0; i < refs.length; i++) {
    if (i > 0) children.push(text(", "));
    children.push(accountOrRepoLink(githubServerURL, refs[i]));
  }

  return children;
}
```

- [ ] **Step 2: Update `src/main.ts`**

In `src/main.ts`, remove the `GithubSlugger` import and the
`createHeadingFactory` import, and simplify the `renderSummary` call:

Remove these imports:

```ts
import GithubSlugger from "github-slugger";
import { createHeadingFactory } from "./markdown.js";
```

Change the summary write block from:

```ts
await summary
  .addRaw(
    renderSummary(
      createHeadingFactory(githubStepSummary, new GithubSlugger()),
      githubServerURL,
      actionURL,
      authorizeResult,
    ),
  )
  .write();
```

To:

```ts
await summary
  .addRaw(renderSummary(githubServerURL, actionURL, authorizeResult))
  .write();
```

Also remove the `githubStepSummary` variable if it is no longer used anywhere
else in the file. Search for other references before removing it.

- [ ] **Step 3: Verify the project compiles**

Run: `npx tsc --noEmit`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/summary.ts src/main.ts
git commit -m "Rewrite summary to use table-based output"
```

---

### Task 5: Rewrite summary tests

**Files:**

- Modify: `test/suite/unit/summary.spec.ts`
- Delete: all existing files under `test/fixture/summary/`

- [ ] **Step 1: Delete old snapshot fixtures**

```bash
rm test/fixture/summary/*.md
```

- [ ] **Step 2: Rewrite `test/suite/unit/summary.spec.ts`**

Replace the entire file with the following content. The tests exercise the same
scenarios as before but with the simplified function signature (no heading
factory). The snapshot fixtures will be auto-generated on first run.

```ts
import { join } from "node:path";
import { expect, it } from "vitest";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import { createProvisionAuthorizer } from "../../../src/provision-authorizer.js";
import { renderSummary } from "../../../src/summary.js";
import { createTestSecretDec, createTestTokenDec } from "../../declaration.js";
import { createTestTokenAuthorizer } from "../../token-authorizer.js";
import { createTestTokenRequestFactory } from "../../token-request.js";

const fixturesPath = join(import.meta.dirname, "../../fixture/summary");
const githubServerURL = "https://github.example.com";
const testDocsURL = "https://github.example.com/test/action";

it("renders a summary with all secrets provisioned", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "all-provisioned.md"));
});

it("renders a summary with some secrets denied", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "some-denied.md"));
});

it("renders a summary with all secrets denied", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({ metadata: "read" });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    { rules: { secrets: [] } },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec({ permissions: { contents: "admin" } }),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "all-denied.md"));
});

it("renders a summary with no secrets requested", async () => {
  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults: [],
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "empty.md"));
});

it("renders a summary with environment targets", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_A"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: {},
                repo: { environments: {} },
                repos: {
                  "account-a/repo-a": {
                    actions: "allow",
                    environments: { production: "allow", staging: "allow" },
                  },
                },
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a", repo: "repo-a" },
      },
      {
        platform: "github",
        type: "environment",
        target: {
          account: "account-a",
          repo: "repo-a",
          environment: "production",
        },
      },
      {
        platform: "github",
        type: "environment",
        target: {
          account: "account-a",
          repo: "repo-a",
          environment: "staging",
        },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "environment-targets.md"));
});

it("renders a summary with multiple requesters", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/*", "account-y/*"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-y", repo: "repo-y" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "multiple-requesters.md"));
});

it("renders a summary with a missing token declaration", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-token-dec.md"));
});

it("renders a summary with missing targets", async () => {
  const createTokenRequest = createTestTokenRequestFactory();
  const tokenAuthorizer = createTestTokenAuthorizer({
    metadata: "read",
    contents: "write",
  });
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    {
      rules: {
        secrets: [
          {
            secrets: ["SECRET_*"],
            requesters: ["account-x/repo-x"],
            to: {
              github: {
                account: {},
                accounts: { "account-a": { actions: "allow" } },
                repo: { environments: {} },
                repos: {},
              },
            },
          },
        ],
      },
    },
  );

  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [
      {
        platform: "github",
        type: "actions",
        target: { account: "account-a" },
      },
    ],
  });
  provisionAuthorizer.authorizeSecret({
    requester: { account: "account-x", repo: "repo-x" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_B",
    to: [],
  });

  const provisionResults = provisionAuthorizer
    .listResults()
    .sort((a, b) => compareProvisionRequest(a.request, b.request));

  await expect(
    renderSummary(githubServerURL, testDocsURL, {
      provisionResults,
      tokenResults: [],
    }),
  ).toMatchFileSnapshot(join(fixturesPath, "missing-targets.md"));
});
```

Key changes from the original test file:

- No `beforeEach` for heading factory — it is no longer needed
- No `GithubSlugger` or `createHeadingFactory` imports
- `renderSummary` calls pass `(githubServerURL, testDocsURL, result)` instead of
  `(headingFactory, githubServerURL, testDocsURL, result)`
- `tokenResults` is passed as an empty array — the summary no longer uses it but
  the `AuthorizeResult` type still requires it
- Removed the `single-secret`, `selected-and-no-repos`, and `token-with-role`
  tests since those were primarily testing token heading rendering which no
  longer exists. Their scenarios are covered by the remaining tests. If coverage
  is incomplete after Task 6, add focused tests back.

- [ ] **Step 3: Run tests to generate snapshot fixtures**

Run: `npm exec -- vitest --run test/suite/unit/summary.spec.ts --update`

Expected: All tests pass and new `.md` fixture files are written under
`test/fixture/summary/`.

- [ ] **Step 4: Inspect the generated fixtures**

Manually review the generated fixtures in `test/fixture/summary/` to confirm:

- The stats heading is correct (e.g. `## Provisioned 2 secrets`)
- The failures table appears above the successes table when both exist
- Each table has columns: (icon), Requester, Secret, Targets
- Secret names are in backticks (inline code)
- Requester repos and targets are linked
- Environment targets deduplicate `account-a/repo-a` (not repeated per
  environment)
- The empty case shows the help text

- [ ] **Step 5: Run the full test suite**

Run: `npm exec -- vitest --run`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rewrite summary tests for table-based output"
```

---

### Task 6: Verify coverage and run precommit

**Files:**

- Potentially modify any source or test file to close coverage gaps

- [ ] **Step 1: Run coverage**

Run: `make coverage`

Expected: 100% coverage. If there are gaps in `src/summary.ts` or
`src/markdown.ts`, add tests to cover them. Likely gap: the `listItem` and
`unorderedList` helpers may now be unused — if so, remove them from
`markdown.ts` and re-run.

- [ ] **Step 2: Remove any helpers that are now unreachable**

Check whether these are still imported anywhere in `src/`:

- `listItem`
- `unorderedList`
- `emphasis`
- `paragraph`

If any are only used by deleted files, remove them from `markdown.ts`.

- [ ] **Step 3: Run precommit**

Run: `make precommit`

Expected: Lint, tests, and generated file verification all pass. Check
`git status` afterwards — if `dist/main.js`, `dist/main.js.map`, or schema files
were regenerated, stage and commit them.

- [ ] **Step 4: Commit any remaining changes**

```bash
git add -A
git commit -m "Clean up unused helpers and regenerate dist"
```
