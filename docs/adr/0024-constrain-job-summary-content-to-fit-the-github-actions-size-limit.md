---
status: accepted
---

# Constrain job summary content to fit the GitHub Actions size limit

The job summary is rendered as compact GFM tables with one row per secret and
deduplicated link reference definitions, because GitHub Actions caps summaries
at 1 MB and the action can provision many secrets. Size scales linearly with a
small constant per row. Verbose per-secret sections were rejected for exceeding
the limit at moderate scale; truncation was rejected as producing broken
Markdown and cutting the most useful rows. The trade-off: per-secret
authorization detail lives in logs instead (ADR-0030).
