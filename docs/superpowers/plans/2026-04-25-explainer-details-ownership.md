# Explainer `<details>` ownership implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `<details>` rendering from `summary.ts` into each markdown
explainer so the explainer owns the full collapsible element.

**Architecture:** Each markdown explainer extracts its current top-level bullet
text (without trailing colon) into a `<summary>`, wraps sub-items in a bullet
list, and returns `[html('<details>...'), bulletList(...), html('</details>')]`.
`summary.ts` stops emitting `<details>` wrapper nodes and deletes the now-unused
summary helper functions.

**Tech Stack:** TypeScript, mdast, Vitest file snapshots

---

### Task 1: Update token auth explainer to render `<details>`

**Files:**

- Modify: `src/token-auth-explainer/markdown.ts`

- [ ] **Step 1: Modify explainer to wrap output in `<details>`**

In each of the three explain functions (`explainAllRepos`, `explainNoRepos`,
`explainSelectedRepos`), replace the single `bulletList(iconItem(...))` return
with three nodes:

1. `html('<details>\n<summary>SUMMARY_TEXT</summary>')` using the existing
   `summaryText()` output (which already has the icon)
2. `bulletList(...)` containing the sub-items that were previously children of
   the top-level `iconItem`
3. `html('</details>')`

Remove the trailing colon from `summaryText()` — change the return from
`...access to a token:` to `...access to a token`.

The `iconItem` helper and `bulletList` helper remain for building sub-items.

- [ ] **Step 2: Delete fixtures and regenerate**

```bash
rm test/fixture/token-auth-explainer/*.md
npm exec -- vitest --run test/suite/unit/token-auth-explainer/markdown.spec.ts
```

This regenerates all 11 fixtures via `toMatchFileSnapshot`. Verify the output
looks correct (each file should now start with `<details>` and end with
`</details>`).

- [ ] **Step 3: Run tests to verify fixtures match**

```bash
npm exec -- vitest --run test/suite/unit/token-auth-explainer/markdown.spec.ts
```

Expected: all 11 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/token-auth-explainer/markdown.ts test/fixture/token-auth-explainer/
git commit -m "Move details rendering into token auth explainer"
```

### Task 2: Update provision auth explainer to render `<details>`

**Files:**

- Modify: `src/provision-auth-explainer/markdown.ts`

- [ ] **Step 1: Modify explainer to wrap output in `<details>`**

In the returned closure, replace the single `bulletList(iconItem(...))` return
with three nodes:

1. `html('<details>\n<summary>SUMMARY_TEXT</summary>')` using the existing
   `summaryText()` output (which already has the icon)
2. `bulletList(...)` containing `tokenDecItem(result)` and
   `...targetItems(result)` as top-level items
3. `html('</details>')`

Remove the trailing colon from `summaryText()` — change the return from
`...provision secret ${request.name}:` to `...provision secret ${request.name}`.

- [ ] **Step 2: Delete fixtures and regenerate**

```bash
rm test/fixture/provision-auth-explainer/*.md
npm exec -- vitest --run test/suite/unit/provision-auth-explainer/markdown.spec.ts
```

This regenerates all 8 fixtures. Verify each starts with `<details>` and ends
with `</details>`.

- [ ] **Step 3: Run tests to verify fixtures match**

```bash
npm exec -- vitest --run test/suite/unit/provision-auth-explainer/markdown.spec.ts
```

Expected: all 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/provision-auth-explainer/markdown.ts test/fixture/provision-auth-explainer/
git commit -m "Move details rendering into provision auth explainer"
```

### Task 3: Remove `<details>` wrapping from summary.ts

**Files:**

- Modify: `src/summary.ts`

- [ ] **Step 1: Update `secretProvisioningSection`**

Remove the three lines that emit `<details>`/`</details>` around the explainer
call (lines 177-181). Replace with just
`nodes.push(...explainProvision(result))`.

Delete `secretDetailsSummary()` function (lines 238-251).

- [ ] **Step 2: Update `tokenIssuingSection`**

Remove the three lines that emit `<details>`/`</details>` around the explainer
call (lines 227-231). Replace with just `nodes.push(...explainToken(result))`.

Delete `tokenDetailsSummary()` function (lines 253-266).

- [ ] **Step 3: Delete summary fixtures and regenerate**

```bash
rm test/fixture/summary/*.md
npm exec -- vitest --run test/suite/unit/summary.spec.ts
```

This regenerates all 11 summary fixtures. Verify the `<details>` now comes from
the explainer text, not from summary.ts.

- [ ] **Step 4: Run tests to verify fixtures match**

```bash
npm exec -- vitest --run test/suite/unit/summary.spec.ts
```

Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/summary.ts test/fixture/summary/
git commit -m "Remove details wrapping from summary module"
```

### Task 4: Precommit and final verification

- [ ] **Step 1: Run precommit**

```bash
make precommit
```

Expected: lint passes, all 592+ tests pass, verify-generated passes.

- [ ] **Step 2: Stage any regenerated files and verify**

```bash
git status
git add dist/
make verify-generated
```

- [ ] **Step 3: Amend last commit with dist changes**

```bash
git add -A
git commit --amend --no-edit
```
