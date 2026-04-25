# Hast for HTML fragments implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace string-built HTML fragments with hast AST nodes serialized via
`hast-util-to-html`.

**Architecture:** Build hast `Element` nodes as plain object literals (matching
how mdast nodes are already built), serialize with `toHtml()` from
`hast-util-to-html`, and embed the resulting strings in mdast `html` nodes. Only
self-contained elements (`<summary>`, `<a>`) become hast nodes — structural
`<details>`/`</details>` tags stay as strings because they wrap mdast content.

**Tech Stack:** `@types/hast` (dev dependency), `hast-util-to-html` (runtime
dependency)

---

### Task 1: Install hast dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install hast-util-to-html
npm install --save-dev @types/hast
```

- [ ] **Step 2: Verify types are available**

Create a temporary test in any `.ts` file to confirm the import resolves:

```ts
import type { Element } from "hast";
import { toHtml } from "hast-util-to-html";
```

Run `npx tsc --noEmit` to verify. Remove the temporary test.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add hast-util-to-html and @types/hast dependencies"
```

---

### Task 2: Convert token auth explainer to hast

**Files:**

- Modify: `src/token-auth-explainer/markdown.ts`
- Test: `test/suite/unit/token-auth-explainer/markdown.spec.ts`
- Fixtures: `test/fixture/token-auth-explainer/*.md`

The token auth explainer has three explain functions that each produce
`<details>` with `<summary>` content, and a `summaryText()` function that builds
the summary string. Convert `summaryText()` to return hast `ElementContent[]`
(an array of hast `Text` nodes), build a hast `<summary>` element, serialize it
with `toHtml()`, and embed it in the mdast `html` node.

- [ ] **Step 1: Add imports**

Add at top of `src/token-auth-explainer/markdown.ts`:

```ts
import type { Element, ElementContent } from "hast";
import { toHtml } from "hast-util-to-html";
```

- [ ] **Step 2: Convert `summaryText()` to return hast children**

Replace the `summaryText()` function:

```ts
// Before:
function summaryText({ request, isAllowed }: TokenAuthResult): string {
  const name = accountOrRepoRefToString(request.consumer);
  const kind = isRepoRef(request.consumer) ? "Repo" : "Account";

  return `${icon(isAllowed)} ${kind} ${name} was ${isAllowed ? "allowed" : "denied"} access to a token`;
}

// After:
function summaryChildren({
  request,
  isAllowed,
}: TokenAuthResult): ElementContent[] {
  const name = accountOrRepoRefToString(request.consumer);
  const kind = isRepoRef(request.consumer) ? "Repo" : "Account";

  return [
    {
      type: "text",
      value: `${icon(isAllowed)} ${kind} ${name} was ${isAllowed ? "allowed" : "denied"} access to a token`,
    },
  ];
}
```

- [ ] **Step 3: Create `detailsOpen()` helper**

Replace the `html()` helper at the bottom of the file:

```ts
// Before:
function html(value: string): Html {
  return { type: "html", value };
}

// After:
function detailsOpen(children: ElementContent[]): Html {
  const summary: Element = {
    type: "element",
    tagName: "summary",
    properties: {},
    children,
  };

  return { type: "html", value: `<details>\n${toHtml(summary)}` };
}

function detailsClose(): Html {
  return { type: "html", value: "</details>" };
}
```

- [ ] **Step 4: Update all three explain functions**

In each of `explainAllRepos()`, `explainNoRepos()`, and
`explainSelectedRepos()`, replace:

```ts
html(`<details>\n<summary>${summaryText(result)}</summary>`);
```

with:

```ts
detailsOpen(summaryChildren(result));
```

And replace:

```ts
html("</details>");
```

with:

```ts
detailsClose();
```

- [ ] **Step 5: Remove unused `Html` import**

The `Html` type from `"mdast"` is still needed (used by `detailsOpen` and
`detailsClose` return types). Keep it. But remove the `Paragraph` import if it
was previously imported but unused.

Actually, check: the current imports are
`import type { Html, List, ListItem, Paragraph, RootContent } from "mdast"`.
`Paragraph` is used by `iconItem()`. Keep all existing mdast imports.

- [ ] **Step 6: Delete fixtures and regenerate**

```bash
rm test/fixture/token-auth-explainer/*.md
npm exec -- vitest --run test/suite/unit/token-auth-explainer/markdown.spec.ts
npm exec -- vitest --run test/suite/unit/token-auth-explainer/markdown.spec.ts
```

The first run creates the fixtures. The second run verifies they match. Both
runs should pass.

- [ ] **Step 7: Verify output is unchanged**

```bash
git diff test/fixture/token-auth-explainer/
```

The fixture content should be identical to the committed versions. If there are
any differences, the hast serialization differs from the previous string
building and needs investigation.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Use hast for summary elements in token auth explainer"
```

---

### Task 3: Convert provision auth explainer to hast

**Files:**

- Modify: `src/provision-auth-explainer/markdown.ts`
- Test: `test/suite/unit/provision-auth-explainer/markdown.spec.ts`
- Fixtures: `test/fixture/provision-auth-explainer/*.md`

Same pattern as task 2. The provision auth explainer has one closure that
produces `<details>` with `<summary>`, and a `summaryText()` function.

- [ ] **Step 1: Add imports**

Add at top of `src/provision-auth-explainer/markdown.ts`:

```ts
import type { Element, ElementContent } from "hast";
import { toHtml } from "hast-util-to-html";
```

- [ ] **Step 2: Convert `summaryText()` to return hast children**

Replace the `summaryText()` function:

```ts
// Before:
function summaryText({ request, isAllowed }: ProvisionAuthResult): string {
  return (
    `${icon(isAllowed)} Repo ${repoRefToString(request.requester)} ` +
    (isAllowed ? "was allowed" : "wasn't allowed") +
    ` to provision secret ${request.name}`
  );
}

// After:
function summaryChildren({
  request,
  isAllowed,
}: ProvisionAuthResult): ElementContent[] {
  return [
    {
      type: "text",
      value:
        `${icon(isAllowed)} Repo ${repoRefToString(request.requester)} ` +
        (isAllowed ? "was allowed" : "wasn't allowed") +
        ` to provision secret ${request.name}`,
    },
  ];
}
```

- [ ] **Step 3: Create `detailsOpen()` and `detailsClose()` helpers**

Replace the `html()` helper at the bottom of the file (line ~200):

```ts
// Before:
function html(value: string): Html {
  return { type: "html", value };
}

// After:
function detailsOpen(children: ElementContent[]): Html {
  const summary: Element = {
    type: "element",
    tagName: "summary",
    properties: {},
    children,
  };

  return { type: "html", value: `<details>\n${toHtml(summary)}` };
}

function detailsClose(): Html {
  return { type: "html", value: "</details>" };
}
```

- [ ] **Step 4: Update the closure**

In the main closure (line ~33-37), replace:

```ts
html(`<details>\n<summary>${summaryText(result)}</summary>`);
```

with:

```ts
detailsOpen(summaryChildren(result));
```

And replace:

```ts
html("</details>");
```

with:

```ts
detailsClose();
```

- [ ] **Step 5: Delete fixtures and regenerate**

```bash
rm test/fixture/provision-auth-explainer/*.md
npm exec -- vitest --run test/suite/unit/provision-auth-explainer/markdown.spec.ts
npm exec -- vitest --run test/suite/unit/provision-auth-explainer/markdown.spec.ts
```

- [ ] **Step 6: Verify output is unchanged**

```bash
git diff test/fixture/provision-auth-explainer/
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Use hast for summary elements in provision auth explainer"
```

---

### Task 4: Convert summary anchor tags to hast

**Files:**

- Modify: `src/summary.ts`
- Test: `test/suite/unit/summary.spec.ts`
- Fixtures: `test/fixture/summary/*.md`

The `headingWithAnchor()` function in `summary.ts` (line ~364) embeds an
`<a id="...">` tag as a string. Convert it to a hast element.

- [ ] **Step 1: Add imports**

Add at top of `src/summary.ts`:

```ts
import type { Element } from "hast";
import { toHtml } from "hast-util-to-html";
```

- [ ] **Step 2: Update `headingWithAnchor()`**

Replace the inline HTML string with a hast element:

```ts
// Before:
function headingWithAnchor(
  depth: 1 | 2 | 3 | 4 | 5 | 6,
  text: string,
  anchorId: string,
): Heading {
  return {
    type: "heading",
    depth,
    children: [
      { type: "text", value: text },
      { type: "html", value: ` <a id="${anchorId}"></a>` },
    ],
  };
}

// After:
function headingWithAnchor(
  depth: 1 | 2 | 3 | 4 | 5 | 6,
  text: string,
  anchorId: string,
): Heading {
  const anchor: Element = {
    type: "element",
    tagName: "a",
    properties: { id: anchorId },
    children: [],
  };

  return {
    type: "heading",
    depth,
    children: [
      { type: "text", value: text },
      { type: "html", value: ` ${toHtml(anchor)}` },
    ],
  };
}
```

Note: `toHtml()` will serialize `<a id="..."></a>` — verify the output matches
the previous string. The leading space before the `<a>` is intentional (it
separates the heading text from the anchor tag).

- [ ] **Step 3: Delete fixtures and regenerate**

```bash
rm test/fixture/summary/*.md
npm exec -- vitest --run test/suite/unit/summary.spec.ts
npm exec -- vitest --run test/suite/unit/summary.spec.ts
```

- [ ] **Step 4: Verify output is unchanged**

```bash
git diff test/fixture/summary/
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Use hast for anchor elements in summary headings"
```

---

### Task 5: Update ADR 0023 and run precommit

**Files:**

- Modify: `docs/adrs/0023-use-mdast-ast-for-job-summary-rendering.md`

- [ ] **Step 1: Update the ADR**

Add a brief mention of hast to the decision and consequences sections. Keep it
concise. The ADR title stays the same (mdast is still the primary tool). Example
addition to the decision section:

> Where the mdast tree needs embedded HTML fragments (e.g. `<summary>` or anchor
> elements), those fragments are built as hast nodes and serialized to HTML
> strings.

And add a consequence:

> - Good, because hast provides proper escaping and composability for HTML
>   fragments embedded within the Markdown AST.

- [ ] **Step 2: Format with Prettier**

```bash
npx prettier --write docs/adrs/0023-use-mdast-ast-for-job-summary-rendering.md
```

- [ ] **Step 3: Run precommit**

```bash
make precommit
```

All tests should pass. Lint should pass. Generated files should be up to date.

- [ ] **Step 4: Check for regenerated files**

```bash
git status
```

Stage any regenerated dist files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Update ADR 0023 to mention hast for HTML fragments"
```
