# Job summaries design

## Overview

Add GitHub Actions job summaries to the provision-github-tokens action. The
summary provides a rich Markdown overview of what was authorized, what failed,
and detailed breakdowns — rendered on the workflow run's summary page via
`@actions/core`'s summary API.

The approach mirrors the
[github-release-from-tag](https://github.com/ghalactic/github-release-from-tag)
action's summary implementation: build an mdast AST, render to Markdown, and
test with file snapshots.

## Summary structure

The summary is a single Markdown document with the following sections:

### Stats heading

A level-3 heading with the primary stat:

```markdown
### Provisioned 47 of 50 secrets
```

If all secrets are provisioned, the heading reads "Provisioned 50 secrets" (or
"Provisioned 1 secret" — proper pluralization throughout). If none are
provisioned, the heading reads "Provisioned 0 of 50 secrets".

### Failures

Only present when there are failures. Contains a list of links to the
corresponding secret detail anchors, grouped by requester:

```markdown
### Failures

#### owner/requester-repo-a

- ❌ [`DEPLOY_TOKEN`](#pgt-stepid-owner-requester-repo-a--deploy-token)
- ❌ [`CI_TOKEN`](#pgt-stepid-owner-requester-repo-a--ci-token)

#### owner/requester-repo-b

- ❌ [`READ_TOKEN`](#pgt-stepid-owner-requester-repo-b--read-token)
```

### Secret provisioning

Detailed provision auth results, grouped by requester repo. Each secret gets its
own heading with a manually inserted HTML anchor and a collapsible `<details>`
section.

```markdown
### Secret provisioning

#### owner/requester-repo

##### DEPLOY_TOKEN

<a id="pgt-stepid-owner-requester-repo--deploy-token"></a>

<details>
<summary>❌ Not provisioned — 2 of 3 targets denied</summary>

(AST-rendered provision auth breakdown)

</details>

##### READ_TOKEN

<a id="pgt-stepid-owner-requester-repo--read-token"></a>

<details>
<summary>✅ Provisioned to 3 targets</summary>

(AST-rendered provision auth breakdown)

</details>
```

The `<details>` summary line provides a quick status. The expanded content
contains the full provision auth breakdown rendered as Markdown, including
nested lists with ✅/❌ icons and links to token auth anchors in the token
issuing section.

Provision results are sorted using `compareProvisionRequest` — requester first,
then secret name, then targets. This means requester groups appear in
alphabetical order and secrets within each group are alphabetically ordered.

### Token issuing

Detailed token auth results, grouped by consumer. Each token gets a heading that
describes its properties (since token declaration names are not available in the
deduplicated token request model).

```markdown
### Token issuing

#### owner/consumer-repo

##### Token for org-a (all repos)

<a id="pgt-stepid-token-1"></a>

Used by:

- [`DEPLOY_TOKEN`](#pgt-stepid-owner-requester-repo--deploy-token)
- [`CI_TOKEN`](#pgt-stepid-owner-other-requester--ci-token)

<details>
<summary>✅ Allowed — write access</summary>

(AST-rendered token auth breakdown)

</details>
```

The "Used by" list is outside the collapsible section so it's visible without
expanding.

Token headings describe the token by its properties:

- **All repos:** "Token for org-a (all repos)"
- **No repos:** "Token for org-a (no repos)"
- **Selected repos:** "Token for org-a (N repos)" — always a count, never
  individual names

The full repo list is available in the expanded details.

Token results are sorted using `compareTokenRequest` — consumer first, then
account, then repos type, then repos, then permissions. Token anchors are
sequential (`token-1`, `token-2`).

The "Used by" list is built via reverse mapping: iterate all provision auth
results, find which target results reference each token auth result, and collect
the secret names and anchors.

## Anchor scheme

Job summaries do not auto-generate heading anchors like regular GitHub Markdown.
All anchors are manually inserted using `<a id="..."></a>` HTML tags.

Anchors use a unique prefix to prevent collisions when the action runs multiple
times in the same workflow job. The prefix is `pgt-` followed by a suffix
derived from `GITHUB_ACTION` (the step ID, unique per job).

**Secret anchors:** `pgt-{stepSuffix}-{requester-slug}--{secret-name-slug}`

**Token anchors:** `pgt-{stepSuffix}-token-{N}` where N is the 1-based index in
the sorted token results.

Slugs are generated using `github-slugger` for consistency with GitHub's anchor
generation logic.

## Architecture

### Pure render function

A `renderSummary()` function that:

1. Takes `AuthorizeResult` (token results + provision results) and a unique
   anchor prefix string
2. Builds an mdast AST internally using helper functions
3. Renders to Markdown via `mdast-util-to-markdown` with `mdast-util-gfm`
4. Returns the rendered Markdown string

The caller (`main.ts`) is responsible for writing the string to
`@actions/core`'s summary via `summary.addRaw(markdown).write()`.

### Markdown explainers

New AST-native explainers alongside the existing text ones:

- **Token auth markdown explainer** — returns `RootContent[]` (mdast nodes)
  representing the full token auth breakdown for a single result. Uses nested
  lists with ✅/❌ icons and permission comparison tables or lists.
- **Provision auth markdown explainer** — returns `RootContent[]` for a single
  provision auth result. Includes links to token auth anchors instead of
  numerical "token #N" references.

These use the existing generic explainer interfaces
(`TokenAuthResultExplainer<T>` and `ProvisionAuthResultExplainer<T>`) with
`T = RootContent[]`.

The provision markdown explainer needs a mapping from `TokenAuthResult` to
anchor ID, which is passed in at creation time (similar to how the text
provision explainer receives the token results list for indexing).

### Integration with main.ts

After the authorizer completes:

1. Call `renderSummary(authorizeResult, anchorPrefix)`
2. Write the returned Markdown to `@actions/core`'s summary

The existing text log output in the authorizer remains unchanged. The summary is
an additional output, not a replacement.

## Existing log output

The current text-based explainers and their log output via `info()` in the
authorizer are preserved as-is. The job summary is a new, independent output
channel.

## Testing

### File snapshot tests

Following the github-release-from-tag pattern:

- Test fixtures in `test/fixture/summary/` — each scenario is a directory
- Each fixture contains the expected Markdown output as an `expected.md` file
- Tests use Vitest's `toMatchFileSnapshot()` to compare rendered output against
  the snapshot file

Fixture scenarios cover:

- All secrets provisioned successfully
- Some secrets failed (mixed allowed/denied)
- All secrets failed
- No secrets requested (empty results)
- Environment targets (including environment names in the output)
- Multiple requesters across multiple organizations
- Multiple consumers
- Selected repos tokens (count in heading)
- No repos tokens
- Tokens with roles
- Shared token declarations
- Multiple targets per secret (actions, codespaces, dependabot, environment)

### Markdown explainer tests

The markdown explainers get their own unit tests with file snapshots. Test
scenarios should match the breadth of the existing text explainer tests. Where
possible, test data setup should be shared between text and markdown explainer
tests — this may require refactoring shared test helpers.

### Summary render tests

End-to-end rendering tests that exercise the full `renderSummary()` function
with realistic input data and compare against expected Markdown snapshots.

## Dependencies

New npm packages:

- `@types/mdast` — TypeScript types for mdast AST nodes (dev dependency)
- `mdast-util-to-markdown` — Render mdast AST to Markdown string
- `mdast-util-gfm` — GFM extension for mdast (tables, strikethrough, etc.)
- `github-slugger` — Generate GitHub-compatible anchor slugs

These are the same packages used by the github-release-from-tag action.
