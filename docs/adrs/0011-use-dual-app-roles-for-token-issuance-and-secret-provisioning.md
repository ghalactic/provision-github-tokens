---
status: accepted
date: 2025-03-02
decision-makers: ezzatron
---

# Use dual app roles for token issuance and secret provisioning

## Context and problem statement

The action performs two distinct operations via GitHub Apps: creating
installation access tokens (issuance) and writing secrets to repos and
organizations (provisioning). These operations require different permissions and
may target different sets of repos. Requiring a separate app for each role adds
setup burden, but combining them without distinction makes it unclear which app
is responsible for what.

## Decision outcome

A single GitHub App can serve two independent roles:

- **Issuer** — creates installation access tokens for requesters
- **Provisioner** — writes secrets to target repos and organizations

Each role can be enabled or disabled independently per app. The app registry
tracks all configured apps, their installations, and which role(s) each serves.

When the system needs to issue a token, it queries the registry for apps with
the issuer role installed on the target. When it needs to write a secret, it
queries for apps with the provisioner role.

### Consequences

- Good, because a single app can serve both roles, reducing setup overhead for
  simple configurations.
- Good, because the roles can be split across separate apps when different
  permission scopes or installation targets are needed.
- Bad, because the dual-role model adds configuration complexity compared to a
  single implicit role.

### Alternatives rejected

- **Single role per app**: requires at least two apps in all configurations,
  even when one app could handle both.
- **Role-per-installation**: too granular — the same app would behave
  differently per installation, making configuration hard to reason about.
- **Implicit role assignment**: unclear which app does what — no explicit signal
  of intent.

## More information

- Related: [ADR-0010] — the two authorization layers align with the two app
  roles

[ADR-0010]: 0010-separate-token-and-provision-authorization.md
