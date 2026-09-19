---
status: accepted
---

# Deduplicate token creation by token shape

Within a single run, token creation results are cached by account, role,
permissions, and resolved repos — the token shape. Consumer identity is excluded
because it doesn't affect the issued token. Including role in the cache key lets
users control deduplication boundaries: tokens with different roles are never
shared (ADR-0013). All result types are cached except authorization failures,
which depend on the consumer rather than the shape. This extends ADR-0025's
authorization-level deduplication to the creation API calls themselves, saving
rate-limited GitHub API capacity; a cached error does affect every consumer of
that shape for the rest of the run, mitigated by retrying before caching.
