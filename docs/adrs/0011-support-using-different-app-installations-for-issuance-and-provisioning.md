---
status: accepted
date: 2025-03-02
decision-makers: ezzatron
---

# Support using different app installations for issuance and provisioning

## Context and problem statement

The action performs two distinct operations via GitHub Apps: creating
installation access tokens (issuance) and writing secrets to repos and
organizations (provisioning). These operations require different permissions and
may target different sets of repos.

A key constraint is that an issuer installation's own permissions act as a hard
boundary for any tokens it creates (see [ADR-0012]). The provisioner needs
permissions like secrets write access that, if granted to an issuer
installation, would expand the boundary of what tokens it could issue. Without
separating issuance and provisioning, there's no way to give the provisioner the
permissions it needs without also expanding the issuer's permissions boundary.

At the same time, requiring two separate apps in every configuration would add
unnecessary setup burden for users who are comfortable with a shared permissions
boundary.

## Decision outcome

A single GitHub App can serve as an issuer, a provisioner, or both:

- **Issuer** — creates installation access tokens for requesters
- **Provisioner** — writes secrets to target repos and organizations

Each of these can be enabled or disabled independently per app. The app registry
tracks all configured apps, their installations, and whether each serves as an
issuer, a provisioner, or both.

When the system needs to issue a token, it queries the registry for issuers
installed on the target. When it needs to write a secret, it queries for
provisioners.

A single app installation can serve as both issuer and provisioner
simultaneously. This is a deliberate choice to keep setup developer-friendly —
users who are happy to accept the combined permissions boundary don't need to
manage multiple apps. Users who want tighter control can use separate apps for
issuance and provisioning, keeping the issuer's permissions boundary minimal.

### Consequences

- Good, because a single app can serve as both issuer and provisioner, reducing
  setup overhead for simple configurations.
- Good, because issuance and provisioning can be split across separate apps when
  the provisioner would otherwise expand the issuer's permissions boundary.
- Bad, because explicitly designating issuers and provisioners adds
  configuration complexity compared to a single implicit purpose.

### Alternatives rejected

- **One purpose per app**: requires at least two apps in all configurations,
  even when one app could handle both.
- **Per-installation designation**: too granular — the same app would behave
  differently per installation, making configuration hard to reason about.
- **Implicit designation**: unclear which app does what — no explicit signal of
  intent.

## More information

- Related: [ADR-0010] — the two authorization layers align with the
  issuer/provisioner split
- Related: [ADR-0012] — installation permissions boundary explains why
  separating issuance and provisioning matters for security

[ADR-0010]: 0010-separate-token-and-provision-authorization.md
[ADR-0012]: 0012-cap-issued-token-permissions-at-installation-boundaries.md
