---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Rely on app installation controls for token revocation

## Context and problem statement

When provisioned tokens need to be immediately revoked, the action has no way to
do so directly. GitHub's API requires possession of a token to revoke it, and
after the action finishes running, only the consumers have the tokens.
Installation access tokens are also short-lived (~1 hour), limiting the window
of exposure.

## Decision

The only supported revocation mechanism is at the app installation level —
revoking permissions from the installation, or disabling/deleting the
installation or app. The action does not implement per-token revocation.

## Consequences

- Good, because no additional infrastructure or consumer cooperation is needed.
- Good, because the short token lifetime limits the exposure window regardless.
- Bad, because revocation is coarse-grained — you can't revoke a single token
  without affecting all tokens issued by the same installation.

## Alternatives considered

- **Consumer-side revocation workflows**: each consuming repo would need
  workflows that the provider could trigger to revoke tokens. Too complex to
  coordinate and fragile to maintain at scale.
- **Central token storage**: the provider retains issued tokens for later
  revocation. Creates a high-value attack target — a single breach exposes every
  active token.
- **Encrypted secrets with a revocable gate key**: provision encrypted secrets
  alongside a separate decryption key that the provider can delete to
  effectively revoke access. Collapses to the same all-or-nothing granularity as
  installation-level controls (one key per secret is impractical), and requires
  every consumer to perform decryption — which excludes consumers like
  Dependabot that need plaintext tokens.

## More information

- Related: [ADR-0012] — installation permissions already act as a hard boundary
  for issued tokens, making installation-level revocation a natural extension

[adr-0012]: 0012-cap-issued-token-permissions-at-installation-boundaries.md
