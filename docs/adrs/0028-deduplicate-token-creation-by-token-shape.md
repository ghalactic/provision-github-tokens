---
status: accepted
date: 2026-04-26
decision-makers: ezzatron
---

# Deduplicate token creation by token shape

## Context and problem statement

Multiple consumers can request tokens with the same shape. Without
deduplication, each triggers a separate API call, wasting rate-limited GitHub
API capacity. ADR 0025 deduplicates at the authorization level; this extends
deduplication to the creation API calls themselves.

## Decision

Cache token creation results within a single action run, keyed by account, role,
permissions, and resolved repos. Consumer identity is excluded because it does
not affect the issued token.

Including role in the cache key gives users control over deduplication
boundaries — tokens with different roles are never shared, even if they would
produce the same API call.

All result types are cached except authorization failures, which depend on the
consumer rather than the token shape.

## Consequences

- Good, because identical tokens are created once, reducing API call volume.
- Bad, because a cached error affects all consumers requesting the same token
  shape for the remainder of the run. Mitigated by the existing retry plugin,
  which retries before the result is cached.

## More information

- [ADR 0025][0025] — authorization-level deduplication counterpart.
- [ADR 0013][0013] — role requirement that makes role-based cache isolation
  meaningful.

[0025]: 0025-deduplicate-token-requests-to-avoid-redundant-authorization.md
[0013]: 0013-require-explicit-role-selection-for-write-level-token-requests.md
