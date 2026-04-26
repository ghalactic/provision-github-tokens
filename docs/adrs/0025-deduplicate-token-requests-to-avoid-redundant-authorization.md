---
status: accepted
date: 2025-05-27
decision-makers: ezzatron
---

# Deduplicate token requests to avoid redundant authorization

## Context and problem statement

Multiple provision requests from different requesters can resolve to token
requests with the same consumer, declaration, and repos. Without deduplication,
the same token request would be authorized multiple times with identical
results.

## Decision

Token requests are normalized and cached by their full shape — consumer,
declaration (including role), and resolved repos. When multiple provision
requests produce the same normalized request, they share a single token request
object that is authorized and issued once.

## Consequences

- Good, because each unique token request is authorized exactly once.
- Bad, because the deduplication is implicit — there is no configuration surface
  for controlling which requests merge.

## Alternatives considered

- **No deduplication**: simpler, but performs redundant authorization work when
  multiple requesters produce identical token requests.
