# ADR Backfill Design

## Goal

Backfill Architecture Decision Records for significant system-level decisions
that were made implicitly during development. Also reformat ADR-0001 to match
the MADR style used by later ADRs.

## ADR-0001 Reformat

Convert ADR-0001 from Nygard format (Context / Decision / Consequences) to the
MADR format used by ADRs 0002–0003:

- Add YAML front matter: `status: accepted`, `date: 2024-08-24`,
  `decision-makers: ezzatron`
- Restructure to use "Context and Problem Statement" and "Decision Outcome"
  headings
- Preserve the original content and external references

## New ADRs

Eight new ADRs, numbered chronologically by when each decision emerged in the
git history. All use the same MADR format as existing ADRs 0002–0003.

### ADR-0004: Two-config system (2024-08-25)

The system uses two separate YAML config files:

- **Provider config** — lives in the repo running the action; defines permission
  rules (what tokens are allowed) and provision rules (where secrets can go)
- **Requester config** — lives in each consuming repo; declares what tokens it
  needs and where to provision them as secrets

This separation means the provider controls policy centrally while requesters
self-serve their own declarations without touching the provider repo.

Context: a single config would either require the provider to enumerate every
requester (doesn't scale) or let requesters self-authorize (insecure). The
two-file split keeps policy and declarations independent.

Alternatives rejected: single centralized config (doesn't scale), requester-only
config (no central policy control), push-based provisioning (provider must know
all consumers upfront).

### ADR-0005: Sequential pipeline architecture (2024-08-25)

The action runs as a fixed sequence of phases:

1. Read provider config
2. Discover GitHub Apps and their installations
3. Discover requester repos and register their token declarations
4. Authorize all token and provision requests
5. Create installation access tokens for authorized requests
6. Provision tokens as secrets

Each phase depends on outputs from prior phases. Authorization needs token
declarations from phase 3. Token creation needs authorization results from
phase 4. This ordering prevents cycles and ensures authorization decisions are
made with complete information.

Alternatives rejected: event-driven (complex state management, eventual
consistency), single-pass interleaving (authorization can't reference
declarations that haven't been discovered yet).

### ADR-0006: GitHub App installations as discovery mechanism (2024-08-31)

Requester repos are discovered by enumerating the repos accessible to
provisioner app installations — not via a central registry or allowlist.

If a provisioner app is installed on an org or repo, that org's repos become
candidates. The system then checks each candidate for a requester config file.

This creates a natural security boundary: only repos where an admin has
deliberately installed the provisioner app can participate. It's also
self-service — adding a repo requires installing the app and adding a config
file, no changes to the provider.

Alternatives rejected: hardcoded allowlist in provider config (inflexible,
doesn't scale), querying all accessible repos without app boundary (loses
security boundary), webhook-driven discovery (requires infrastructure, eventual
consistency).

### ADR-0007: Token declaration sharing model (2024-10-13)

Token declarations have a `shared` flag:

- **Private** (default) — only the declaring repo can use the token
- **Shared** — any requester repo can reference and use the token

Declarations are identified by `{owner/repo}.{name}`. When a repo references a
token declaration, the registry checks: is it shared, or does the reference come
from the declaring repo itself?

This supports both self-contained repos (private tokens) and organizations where
a central repo defines reusable token declarations for others.

Alternatives rejected: all tokens private (forces duplication across repos), all
tokens shared (namespace conflicts, no isolation), per-requester access lists
(complex to maintain for little benefit).

### ADR-0008: Provider-controlled trust model (2024-10-14)

The provider repo's configuration is the sole authority on what tokens
requesters can obtain. Requesters declare what they _want_; the provider decides
what they're _allowed_.

Provider permission rules specify:

- Which consumers (repos or accounts, matched by pattern) can request tokens
- For which target resources (all repos, specific repos, or no repos)
- With what permission levels

Requesters cannot escalate beyond what the provider allows. The provider has
veto power over every token request.

Alternatives rejected: requester-declared permissions with no central control
(insecure), transitive delegation chains (hard to audit), per-token static
allowlists (inflexible).

### ADR-0009: Human-readable authorization explanations (2024-10-14)

Every authorization decision produces a human-readable text explanation that
appears in the GitHub Actions log. The explanation describes:

- What was requested (token permissions, target repos, secret destinations)
- Whether it was allowed or denied
- Which rules matched and what they contributed
- Why the final decision was reached

This exists because the authorization rule system is complex (layered pattern
matching across multiple rules), and denied requests are otherwise opaque.
Explanations serve as an audit trail and a debugging tool.

Alternatives rejected: silent pass/fail (no debugging), raw rule dumps (not
human-readable), separate audit log system (unnecessary complexity for an action
that runs in CI).

### ADR-0010: Two-layer authorization (2025-02-03)

Authorization is split into two independent checks that must both pass:

1. **Token authorization** — can this requester get a token with these
   permissions for these repos?
2. **Provision authorization** — can this requester place a secret in this scope
   (actions, codespaces, dependabot, environment) at this target?

These are orthogonal: a requester might be allowed to obtain a token but not
provision it to a particular secret scope, or vice versa. Splitting them gives
providers fine-grained control over both _what tokens exist_ and _where they end
up_.

This also reflects the architecture — token issuance and secret provisioning may
use different GitHub Apps with different capabilities.

Alternatives rejected: single unified authorization (can't independently control
token permissions vs. secret placement), provision-only authorization (can't
restrict which tokens exist).

### ADR-0011: App registry with dual roles (2025-03-02)

A single GitHub App can serve two independent roles:

- **Issuer** — creates installation access tokens for requesters
- **Provisioner** — writes secrets to target repos and organizations

Each role can be enabled or disabled independently per app. The app registry
tracks all configured apps, their installations, and which role(s) each serves.

When the system needs to issue a token, it queries the registry for apps with
the issuer role installed on the target. When it needs to write a secret, it
queries for apps with the provisioner role.

This avoids requiring separate apps for token issuance and secret writing, while
still allowing the roles to be split across apps when desired.

Alternatives rejected: single role per app (requires two apps minimum),
role-per-installation (too granular, hard to configure), implicit role
assignment (unclear which app does what).

## Format

All ADRs (including the reformatted 0001) use this structure:

```markdown
---
status: accepted
date: YYYY-MM-DD
decision-makers: ezzatron
---

# Title in sentence case

## Context and problem statement

## Decision outcome

### Consequences

### Alternatives rejected

## More information (optional, for cross-references)
```

All headings, titles, and table headers use **sentence case** (only the first
word and proper nouns are capitalized). This applies to both new and existing
ADRs — ADRs 0002 and 0003 should also be reformatted to use sentence case.

Per project conventions:

- No references to specific file paths, function names, or code symbols
- No references to GitHub issues or PRs
- Self-contained — a reader must understand each decision from the ADR alone
- Concise — only include sections that earn their keep
