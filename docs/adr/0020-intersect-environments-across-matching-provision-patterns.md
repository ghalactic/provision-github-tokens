---
status: accepted
---

# Intersect environments across matching provision patterns

When multiple repo patterns in a declaration match the same physical repository,
their environment lists are intersected: only environments present in every
matching pattern are provisioned. This is stricter than secret types, which use
union semantics, because environments usually represent deployment stages where
unintended access is higher-impact. Union was rejected because a broad pattern
would override the intent of narrower ones; last-pattern-wins was rejected as a
fragile ordering dependency.
