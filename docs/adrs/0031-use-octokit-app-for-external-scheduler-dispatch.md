---
status: accepted
date: 2026-05-19
decision-makers: ezzatron
---

# Use octokit App for external scheduler dispatch

## Context and problem statement

The external scheduler examples need to authenticate as a GitHub App and
dispatch a workflow. This requires JWT creation, installation token exchange,
request retries on transient failures, and rate limit handling. Building these
capabilities from scratch would duplicate logic that already exists in
well-maintained libraries.

## Decision

Use the batteries-included `octokit` package's `App` class for all GitHub API
interaction in the external scheduler. The `App` class handles JWT signing,
installation token lifecycle, automatic retries (via `@octokit/plugin-retry`),
and rate limit throttling transparently — eliminating the need for custom auth
or retry modules.

## Consequences

- Good, because the scheduler dispatch logic is ~50 lines with no custom auth or
  retry code.
- Good, because retry behavior stays current with upstream improvements to
  `@octokit/plugin-retry`.
- Bad, because the bundled output is larger than a minimal hand-rolled approach.
  This is acceptable for serverless functions that run infrequently.

## Alternatives considered

- **Manual JWT + fetch with custom retry**: rejected because it duplicates
  well-tested logic, increases maintenance surface, and risks subtle auth bugs.
