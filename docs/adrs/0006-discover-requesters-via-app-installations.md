---
status: accepted
date: 2024-08-31
decision-makers: ezzatron
---

# Discover requesters via app installations

## Context and problem statement

The action needs to find which repos want tokens provisioned. A central registry
of requesters in the provider config would be inflexible and require
provider-side changes for every new requester. The discovery mechanism also
needs a security boundary — not every repo in an organization should be able to
participate.

## Decision outcome

Discover requesters by enumerating the repos accessible to provisioner app
installations. If a provisioner app is installed on an org or repo, that org's
repos become candidates. The action then checks each candidate for a requester
config file.

This creates a natural security boundary: only repos where an admin has
deliberately installed the provisioner app can participate. It's also
self-service — adding a repo requires installing the app and adding a config
file, with no changes to the provider.

### Consequences

- Good, because the security boundary is enforced by GitHub's app installation
  model — no custom access control needed.
- Good, because onboarding is self-service for org admins.
- Bad, because discovery requires enumerating all installations and their repos,
  which scales with the number of installations.

### Alternatives rejected

- **Hardcoded allowlist in provider config**: inflexible — doesn't scale and
  requires provider changes for each new requester.
- **Query all accessible repos without app boundary**: loses the security
  boundary — any accessible repo could participate.
- **Webhook-driven discovery**: requires webhook infrastructure and introduces
  eventual consistency.
