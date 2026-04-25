---
status: accepted
date: 2026-04-24
decision-makers: ezzatron
---

# Use mdast AST for job summary rendering

## Context and problem statement

The job summary uses complex nested Markdown — collapsible sections,
cross-reference anchors, nested lists, and status icons. A rendering approach is
needed that handles this reliably and stays maintainable.

## Decision

Build summaries by constructing an mdast (Markdown Abstract Syntax Tree) and
serializing to Markdown.

## Consequences

- Good, because AST composition avoids brittle string concatenation for deeply
  nested output.
- Good, because sections can be added or restructured without worrying about
  whitespace or escaping.
- Bad, because the mdast libraries add to the bundle size.

## Alternatives considered

- **String concatenation:** no dependencies, but fragile for deeply nested
  Markdown.
- **`@actions/core` summary helpers:** imperative mutation-based API that makes
  composition difficult and doesn't support the level of nesting needed.
