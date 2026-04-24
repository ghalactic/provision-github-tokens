---
status: accepted
date: 2024-08-26
decision-makers: ezzatron
---

# Require explicit role selection for write-level token requests

## Context and problem statement

When a requester declares a token, the action needs to know which GitHub App
should issue it. For read-only tokens this is mostly a technical detail, but for
tokens with write or above access it becomes a user-facing concern: when a token
is used to perform write operations (creating comments, pushing commits, merging
pull requests, etc.), GitHub attributes those actions to the app that created
the token. The app's name and avatar appear as the author in the GitHub UI.

If the action silently picks an app, users lose control over which identity
appears alongside their automated actions.

## Decision

Token declarations that request write-level access or above must include an
explicit role specifying which app should issue the token. The action refuses to
create a write-level token without a role.

Read-only token declarations may omit the role, allowing the action to
automatically select a suitable issuer.

## Consequences

- Good, because users are always in control of which app identity is associated
  with write operations.
- Good, because it prevents accidental attribution — an automated comment or
  commit won't unexpectedly appear under the wrong app's name.
- Good, because it makes token declarations self-documenting — the role makes it
  clear which app is intended.
- Bad, because it adds a mandatory field to write-level token declarations,
  increasing configuration verbosity.

## Alternatives considered

- **Always require a role**: unnecessarily verbose for read-only tokens where
  attribution isn't visible.
- **Auto-select an app for all tokens**: users lose control over which app
  identity appears in the GitHub UI for write operations.
- **Let users optionally specify a role**: users who forget to specify a role
  for write tokens would get surprising attribution behavior with no warning.
