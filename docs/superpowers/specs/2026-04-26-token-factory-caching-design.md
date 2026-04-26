# Token factory caching design

## Problem

The token factory creates a separate GitHub API call
(`createInstallationAccessToken`) for every `TokenAuthResult`, even when
multiple consumers request the same token shape. This wastes rate-limited API
calls and creates redundant tokens.

## Approach

Add an internal cache to the token factory keyed by the fields that determine
the API call. Multiple auth results that share a cache key receive the same
`TokenCreationResult` object. The external API is unchanged.

## Cache key

A private function serializes `{ account, as, permissions, repos }` from the
`TokenRequest` using `fast-json-stable-stringify`.

- **Included:** `tokenDec.account`, `tokenDec.as`, `tokenDec.permissions`,
  `request.repos` (resolved repo list)
- **Excluded:** `consumer` (authorization only), `tokenDec.shared` (declaration
  reuse, not token reuse), `tokenDec.repos` (patterns — the resolved
  `request.repos` captures the result)

The `as` (role) field gives users control over deduplication:

- Read-only tokens without a role are freely deduplicated
- Write/admin tokens require a role, so they only deduplicate with same-role
  requests
- Read-only tokens can opt into role-based isolation by specifying a role

## Cache storage

A `Record<string, TokenCreationResult>` local to the single factory invocation,
matching the POJO pattern used in `createTokenRequestFactory`. Fresh tokens are
issued on each action run, so single-invocation scope is by design.

## Control flow

1. `!isAllowed` → `NOT_ALLOWED` (never cached — consumer-dependent)
2. Cache hit → reuse cached result
3. Resolve issuer → `NO_ISSUER` if not found (cached)
4. API call → `CREATED` / `REQUEST_ERROR` / `ERROR` (cached)

Errors are cached because the Octokit retry plugin already handles retries
within a single API call. A second attempt with identical parameters would
almost certainly fail again.

## Logging

When deduplication occurs:

```
Created 2 unique tokens for 5 token requests
```

When no deduplication occurred (counts match):

```
Created 2 tokens
```

The "not created" message is unchanged:

```
3 requested tokens weren't created
```

Unique count comes from `CREATED` entries in the cache. Total count comes from
`CREATED` entries in the results map.

## Testing

Behavior-based testing through the public `TokenFactory` interface. No mock call
counting — verify outcomes, not implementation details. Coverage confirms cache
branches are hit.

Test cases:

- **Deduplication with same key** — two auth results with identical
  `(account, as, permissions, repos)` but different consumers receive the same
  `TokenCreationResult` object (verified via reference identity)
- **No dedup with different roles** — same permissions and repos but different
  `as` values produce separate results
- **No dedup with different permissions or repos** — standard non-matching cases
- **NOT_ALLOWED bypass** — an unauthorized auth result gets `NOT_ALLOWED` even
  if a cached `CREATED` result exists for the same key
- **NO_ISSUER caching** — two auth results that share a key and have no issuer
  receive the same `NO_ISSUER` result
- **Error caching** — a failed request is cached and reused for subsequent
  matching auth results
- **Log messages** — verify the dedup-aware message format when counts differ,
  and the simpler format when they match
