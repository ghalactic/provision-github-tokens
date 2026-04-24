---
status: accepted
date: 2026-04-24
decision-makers: ezzatron
---

# Use mdast AST for job summary rendering

## Context and problem statement

The action produces no user-visible output after a run. Operators have no way to
see which secrets were provisioned, which were denied, or why — they must read
raw logs. A GitHub Actions job summary would surface this information directly
in the workflow run UI.

## Decision

Build job summaries by constructing an mdast (Markdown Abstract Syntax Tree) and
rendering it with `mdast-util-to-markdown`. The summary renderer is a pure
function that takes authorization results and returns a Markdown string.
Existing text-based authorization explainers are complemented by parallel
markdown explainers that return mdast node arrays instead of strings.

The summary is structured as:

- A stats heading with proper pluralization
- A failures section listing denied secrets
- Expandable detail sections for each secret's provisioning rationale
- An expandable token issuing section with cross-reference anchors linking
  secrets to the tokens they depend on

Tests use `toMatchFileSnapshot()` with committed `.md` fixture files so that
expected output is reviewable as plain Markdown.

## Consequences

- Good, because structural composition via AST nodes avoids brittle string
  concatenation and makes the output easy to extend.
- Good, because fixture-based snapshot tests make expected Markdown output
  directly reviewable in pull requests.
- Bad, because `mdast-util-to-markdown` and supporting packages add to the
  bundle size.
- Bad, because fixture files must be excluded from Prettier to preserve the
  exact output of `toMarkdown()`.

## Alternatives considered

- String template concatenation: simpler with no dependencies, but fragile for
  deeply nested Markdown (lists inside details inside sections) and harder to
  test structurally.
