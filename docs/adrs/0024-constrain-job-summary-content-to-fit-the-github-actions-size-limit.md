---
status: accepted
date: 2026-04-25
decision-makers: ezzatron
---

# Constrain job summary content to fit the GitHub Actions size limit

## Context and problem statement

GitHub Actions job summaries have a hard limit of 1 MB. The action can provision
many secrets across many repositories, so summary content must scale
efficiently.

## Decision

Render the job summary as compact GFM tables with one row per secret and
deduplicated link reference definitions to avoid repeating URLs.

## Consequences

- Good, because summary size scales linearly with a small constant per row.
- Bad, because per-secret authorization detail must be found in logs instead.

## Alternatives considered

- **Verbose per-secret sections:** output size grew too quickly and would exceed
  the limit at moderate scale.
- **Truncating at the limit:** would produce broken Markdown and cut the most
  useful rows.
