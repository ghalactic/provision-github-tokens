# Explainer `<details>` ownership

## Problem

The job summary wraps each explainer's output in `<details>` and provides its
own `<summary>` text (e.g. "✅ Provisioned to 1 target"). This splits rendering
responsibility — the summary module chooses the collapsed label while the
explainer fills the body. The explainer already knows everything needed to
produce a good collapsed label (it's the same text as the current top-level
bullet item).

## Decision

Move `<details>` rendering into the markdown explainers so each explainer owns
the full collapsible element.

## Design

### Markdown explainer output (both token and provision)

Each markdown explainer currently returns a single bullet list whose top-level
item summarizes the result and whose sub-items give the detail. After this
change, each explainer returns:

1. `html('<details>\n<summary>SUMMARY_TEXT</summary>')` — where `SUMMARY_TEXT`
   is the current top-level bullet text (icon + prose), with the trailing colon
   removed (colons introduce sub-items in a list, but don't belong in a
   `<summary>`)
2. A bullet list of the current sub-items (promoted to top-level items)
3. `html('</details>')`

The return type stays `RootContent[]`.

### Token auth explainer example

Before:

```markdown
- ✅ Account account-a was allowed access to a token:
  - ✅ Read access to all repos in account-a requested without a role
  - ✅ Sufficient access to all repos in account-a based on 1 rule:
    - ✅ Rule #1 gave sufficient access:
      - ✅ metadata: have read, wanted read
```

After:

```markdown
<details>
<summary>✅ Account account-a was allowed access to a token</summary>

- ✅ Read access to all repos in account-a requested without a role
- ✅ Sufficient access to all repos in account-a based on 1 rule:
  - ✅ Rule #1 gave sufficient access:
    - ✅ metadata: have read, wanted read

</details>
```

### Provision auth explainer example

Before:

```markdown
- ✅ Repo account-x/repo-x was allowed to provision secret SECRET_A:
  - ✅ Can use token declaration account-a/repo-a.tokenA
  - ✅ Can provision token to GitHub Actions secret in account-a:
    - ✅ Account account-a was allowed access to token #1
    - ✅ Can provision secret based on 1 rule:
      - ✅ Allowed by rule #1
```

After:

```markdown
<details>
<summary>✅ Repo account-x/repo-x was allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in account-a:
  - ✅ Account account-a was allowed access to token #1
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>
```

### Changes to summary.ts

- `secretProvisioningSection` and `tokenIssuingSection` stop emitting
  `<details>`/`</details>` HTML nodes and stop calling `secretDetailsSummary()`
  / `tokenDetailsSummary()`. Explainer output is spread directly.
- `secretDetailsSummary()` and `tokenDetailsSummary()` are deleted.

### What doesn't change

- Text explainers — unchanged, no `<details>` rendering.
- Explainer return type — still `RootContent[]`.
- Explainer factory signatures — unchanged.
- Summary structure (headings, anchors, "used by" lists) — unchanged.

### Testing

- Explainer fixture files update to include `<details>` wrapping.
- Summary fixture files update to reflect the new collapsed labels.
- 100% coverage maintained.
