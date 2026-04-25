---
status: accepted
date: 2026-04-24
decision-makers: ezzatron
---

# Use ASTs for job summary rendering

## Context and problem statement

The job summary contains structured Markdown — GFM tables, headings, and link
reference definitions. A rendering approach is needed that handles this reliably
and stays maintainable.

## Decision

Build summaries by constructing an mdast (Markdown Abstract Syntax Tree) and
serializing to Markdown with the GFM extension.

## Consequences

- Good, because AST composition avoids brittle string concatenation.
- Good, because sections can be added or restructured without worrying about
  whitespace or escaping.
- Bad, because the mdast libraries add to the bundle size.

## Alternatives considered

- **String concatenation:** no dependencies, but fragile for structured Markdown
  with tables and link references.
- **`@actions/core` summary helpers:** imperative mutation-based API that makes
  composition difficult.
