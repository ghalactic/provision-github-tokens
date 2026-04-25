# Simplified summary tables

## Problem

GitHub Actions job summaries have a 1 MB maximum size. The current summary
output is verbose — each secret gets nested headings (h2→h6), `<details>` blocks
with full authorization explainer output, cross-reference links, and per-rule /
per-permission breakdowns. At scale, this easily exceeds 1 MB well before
reaching the number of tokens the action should support.

## Decision

Replace the entire summary output with a simple table-based layout. Remove the
markdown authorization explainers and all token-related summary sections. Keep
the mdast-based approach to building the AST.

## Summary structure

1. **Stats heading** (h2) — "Provisioned X of Y secrets". Same logic as today.
2. **Failures table** — present only when there are denied secrets. One row per
   denied `ProvisionAuthResult`.
3. **Successes table** — present only when there are allowed secrets. One row
   per allowed `ProvisionAuthResult`.
4. **Empty state** — when there are no provision results and no token results,
   show the existing help text with a link to the docs.

There is no token section. Tokens are still issued by the action but are not
displayed in the summary.

### Table columns

Both tables share the same columns:

| Column    | Content                                                         |
| --------- | --------------------------------------------------------------- |
| (no name) | Status icon (✅ or ❌)                                          |
| Requester | Requester repo, linked to GitHub                                |
| Secret    | Secret name in inline code                                      |
| Targets   | Comma-separated list of target accounts/repos, linked to GitHub |

Each row represents one `ProvisionAuthResult`. When a secret has multiple
provision targets, the unique target accounts and repos are deduplicated,
sorted, and combined in the targets cell — separated by commas. Only accounts
and repos are shown; the secret type (actions, codespaces, dependabot,
environment) is not displayed.

### Headings

The heading factory (`createHeadingFactory`) is removed. Headings are built as
plain mdast `Heading` nodes with no anchor IDs. This removes the need for
`github-slugger`, `node:crypto` hashing, and `hast-util-to-html`.

The `renderSummary` function no longer accepts a `HeadingFactory` parameter. A
simple `heading()` helper is added to `markdown.ts` that creates a plain
`Heading` node.

## Markdown helpers

### New helper

A single `table()` function is added to `markdown.ts`:

```ts
function table(
  align: AlignType[] | undefined,
  headings: TableCell["children"][],
  rows: TableCell["children"][][],
): Table;
```

This builds a full GFM `Table` mdast node including the header row and body
rows. It follows the `createTableAST` pattern from github-release-from-tag but
uses this project's convention of deriving child types from parent mdast types
(e.g. `TableCell["children"]` rather than `PhrasingContent[]`).

No separate `tableRow` or `tableCell` helpers — those are internal to the
`table()` function.

### Removed helpers

The following helpers are removed from `markdown.ts` because they are no longer
used:

- `createHeadingFactory()` and `HeadingFactory` type
- `anchorLink()`
- `details()`
- `HTMLInlineCode()`
- `HTMLLink()`
- `accountOrRepoHTMLLink()`

Any other helpers that become unused after the rewrite are also removed.

## File changes

### Deleted files

- `src/token-auth-explainer/markdown.ts`
- `src/provision-auth-explainer/markdown.ts`
- `test/suite/unit/token-auth-explainer/markdown.spec.ts`
- `test/suite/unit/provision-auth-explainer/markdown.spec.ts`
- All fixtures under `test/fixture/token-auth-explainer/`
- All fixtures under `test/fixture/provision-auth-explainer/`

### Updated files

- `src/summary.ts` — rewritten to produce table-based output
- `src/markdown.ts` — add `table()`, remove unused helpers
- `test/suite/unit/summary.spec.ts` — updated tests with new snapshot fixtures
- All fixtures under `test/fixture/summary/` — regenerated to match new output

### Dependency cleanup

The following npm dependencies are removed:

- `github-slugger` (and `@types/github-slugger` if present)
- `hast-util-to-html`
- `@types/hast`

These were only used by the heading factory, the `details()` helper, and the
markdown explainers — all of which are removed. The `node:crypto` import in
`markdown.ts` is also removed.

## Formatting conventions

- Secret names use `inlineCode()` (backtick-wrapped in markdown)
- Account and repo names use `accountOrRepoLink()` (linked to GitHub)
- Status icons are rendered with `renderIcon()`
