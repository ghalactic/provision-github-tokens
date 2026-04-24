---
status: accepted
date: 2025-02-26
decision-makers: ezzatron
---

# Reject empty token permission requests

## Context and problem statement

The GitHub API for creating installation access tokens treats an empty
permissions object as a request for all permissions that the app installation
has. This means that if a token declaration accidentally specifies no meaningful
permissions — either an empty object or one where every entry is `none` — the
resulting API call would produce a token with the maximum possible permissions
rather than a token with no permissions.

## Decision

Token authorization rejects requests with empty permissions — permission objects
where no entry has a meaningful access level (`read`, `write`, or `admin`). This
validation happens before any authorization rules are evaluated.

## Consequences

- Good, because config mistakes that result in empty permissions are caught as
  errors rather than producing unexpectedly powerful tokens.
- Good, because token scope is always explicit and auditable.
- Bad, because there is no way to intentionally request all of an installation's
  permissions — the request must always enumerate them.

## Alternatives considered

- **Pass empty permissions through to the API**: would grant all installation
  permissions, completely undermining the permission rule system.
- **Treat empty as "no permissions"**: contradicts the API's actual behavior,
  producing a confusing outcome.
- **Warn but proceed**: the consequence (a maximally-permissioned token) is too
  severe for a warning.
