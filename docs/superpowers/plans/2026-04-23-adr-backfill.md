# ADR backfill implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backfill 8 system-level ADRs, reformat ADR-0001 to MADR style, and
apply sentence case to all ADR headings.

**Architecture:** Pure documentation work. Each task creates or edits one or
more markdown files in `docs/adrs/`, runs Prettier, and commits. No code
changes.

**Tech Stack:** Markdown (MADR format), Prettier

---

### Task 1: Reformat ADR-0001 to MADR style with sentence case

**Files:**

- Modify: `docs/adrs/0001-record-architecture-decisions.md`

- [ ] **Step 1: Rewrite ADR-0001**

Replace the entire contents of `docs/adrs/0001-record-architecture-decisions.md`
with:

```markdown
---
status: accepted
date: 2024-08-24
decision-makers: ezzatron
---

# Record architecture decisions

## Context and problem statement

We need to record the architectural decisions made on this project so that
future contributors can understand the reasoning behind them.

## Decision outcome

We will use Architecture Decision Records, as described by Michael Nygard in his
article [Documenting architecture decisions].

[documenting architecture decisions]:
  https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions

### Consequences

See Michael Nygard's article, linked above. For a lightweight ADR toolset, see
[adrs].

[adrs]: https://joshrotenberg.com/adrs
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0001-record-architecture-decisions.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0001-record-architecture-decisions.md
git commit -m "docs: reformat ADR-0001 to MADR style with sentence case"
```

### Task 2: Apply sentence case to ADR-0002 and ADR-0003 headings

**Files:**

- Modify:
  `docs/adrs/0002-use-two-tier-resolution-for-permission-name-patterns.md`
- Modify:
  `docs/adrs/0003-resolve-permission-patterns-against-requested-permissions-only.md`

- [ ] **Step 1: Update ADR-0002 headings to sentence case**

In `docs/adrs/0002-use-two-tier-resolution-for-permission-name-patterns.md`,
change:

- `# Use two-tier resolution for permission name patterns` → no change needed
  (already sentence case)
- `## Context and Problem Statement` → `## Context and problem statement`
- `## Decision Outcome` → `## Decision outcome`
- `### Consequences` → no change needed
- `### Alternatives rejected` → no change needed
- `## More Information` → `## More information`

- [ ] **Step 2: Update ADR-0003 headings to sentence case**

In
`docs/adrs/0003-resolve-permission-patterns-against-requested-permissions-only.md`,
change:

- `## Context and Problem Statement` → `## Context and problem statement`
- `## Decision Outcome` → `## Decision outcome`
- `### Consequences` → no change needed
- `### Alternatives rejected` → no change needed
- `## More Information` → `## More information`

- [ ] **Step 3: Run Prettier on both files**

Run:

```bash
npm exec -- prettier --write \
  docs/adrs/0002-use-two-tier-resolution-for-permission-name-patterns.md \
  docs/adrs/0003-resolve-permission-patterns-against-requested-permissions-only.md
```

Incorporate any formatting changes.

- [ ] **Step 4: Commit**

```bash
git add docs/adrs/0002-use-two-tier-resolution-for-permission-name-patterns.md \
       docs/adrs/0003-resolve-permission-patterns-against-requested-permissions-only.md
git commit -m "docs: apply sentence case to ADR-0002 and ADR-0003 headings"
```

### Task 3: Write ADR-0004 — Two-config system

**Files:**

- Create: `docs/adrs/0004-separate-provider-and-requester-configuration.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0004-separate-provider-and-requester-configuration.md` with:

```markdown
---
status: accepted
date: 2024-08-25
decision-makers: ezzatron
---

# Separate provider and requester configuration

## Context and problem statement

The action needs configuration to define both what tokens are allowed (policy)
and what tokens each repo needs (declarations). Combining these into a single
config file would either require the provider to enumerate every consuming repo
or let consuming repos self-authorize.

## Decision outcome

Use two separate YAML config files:

- **Provider config** — lives in the repo running the action; defines permission
  rules (what tokens are allowed) and provision rules (where secrets can go)
- **Requester config** — lives in each consuming repo; declares what tokens it
  needs and where to provision them as secrets

The provider controls policy centrally while requesters self-serve their own
declarations without touching the provider repo.

### Consequences

- Good, because policy and declarations are independently maintained.
- Good, because adding a new requester doesn't require changes to the provider
  repo.
- Bad, because two config files can drift out of sync if not coordinated.

### Alternatives rejected

- **Single centralized config**: doesn't scale — provider must enumerate every
  requester.
- **Requester-only config**: no central policy control — requesters could
  self-authorize.
- **Push-based provisioning**: provider must know all consumers upfront; doesn't
  support self-service.
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0004-separate-provider-and-requester-configuration.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0004-separate-provider-and-requester-configuration.md
git commit -m "docs: add ADR-0004 separate provider and requester configuration"
```

### Task 4: Write ADR-0005 — Sequential pipeline architecture

**Files:**

- Create: `docs/adrs/0005-use-a-sequential-pipeline-architecture.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0005-use-a-sequential-pipeline-architecture.md` with:

```markdown
---
status: accepted
date: 2024-08-25
decision-makers: ezzatron
---

# Use a sequential pipeline architecture

## Context and problem statement

The action must read configuration, discover apps and requesters, authorize
requests, create tokens, and provision secrets. These operations have data
dependencies — for example, authorization needs token declarations that come
from requester discovery, and token creation needs authorization results.

## Decision outcome

Run the action as a fixed sequence of phases:

1. Read provider config
2. Discover GitHub Apps and their installations
3. Discover requester repos and register their token declarations
4. Authorize all token and provision requests
5. Create installation access tokens for authorized requests
6. Provision tokens as secrets

Each phase depends on outputs from prior phases. This ordering prevents cycles
and ensures authorization decisions are made with complete information.

### Consequences

- Good, because data dependencies are satisfied by construction — no phase runs
  before its inputs are ready.
- Good, because the flow is deterministic and easy to debug from logs.
- Bad, because all discovery must complete before any authorization begins, even
  if some requesters could be processed earlier.

### Alternatives rejected

- **Event-driven**: complex state management with eventual consistency; hard to
  reason about when all inputs are ready.
- **Single-pass interleaving**: authorization can't reference token declarations
  that haven't been discovered yet.
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0005-use-a-sequential-pipeline-architecture.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0005-use-a-sequential-pipeline-architecture.md
git commit -m "docs: add ADR-0005 use a sequential pipeline architecture"
```

### Task 5: Write ADR-0006 — GitHub App installations as discovery

**Files:**

- Create: `docs/adrs/0006-discover-requesters-via-app-installations.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0006-discover-requesters-via-app-installations.md` with:

```markdown
---
status: accepted
date: 2024-08-31
decision-makers: ezzatron
---

# Discover requesters via app installations

## Context and problem statement

The action needs to find which repos want tokens provisioned. A central registry
of requesters in the provider config would be inflexible and require
provider-side changes for every new consumer. The discovery mechanism also needs
a security boundary — not every repo in an organization should be able to
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
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0006-discover-requesters-via-app-installations.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0006-discover-requesters-via-app-installations.md
git commit -m "docs: add ADR-0006 discover requesters via app installations"
```

### Task 6: Write ADR-0007 — Token declaration sharing model

**Files:**

- Create: `docs/adrs/0007-support-shared-and-private-token-declarations.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0007-support-shared-and-private-token-declarations.md` with:

```markdown
---
status: accepted
date: 2024-10-13
decision-makers: ezzatron
---

# Support shared and private token declarations

## Context and problem statement

Multiple repos in an organization often need the same token (same permissions,
same target account). Without a sharing mechanism, each repo must duplicate the
full token declaration. But making all declarations globally visible creates
namespace conflicts and removes isolation between unrelated repos.

## Decision outcome

Token declarations have a sharing flag:

- **Private** (default) — only the declaring repo can use the declaration
- **Shared** — any requester repo can reference and use the declaration

Declarations are identified by `{owner/repo}.{name}`. When a repo references a
declaration, the registry checks whether it's shared or whether the reference
comes from the declaring repo itself.

This supports both self-contained repos (private declarations) and organizations
where a central repo defines reusable declarations for others.

### Consequences

- Good, because shared declarations eliminate duplication across repos.
- Good, because private-by-default prevents accidental exposure.
- Bad, because shared declarations create coupling between repos — changes to a
  shared declaration affect all consumers.

### Alternatives rejected

- **All declarations private**: forces duplication across repos that need the
  same token.
- **All declarations shared**: namespace conflicts and no isolation between
  unrelated repos.
- **Per-requester access lists**: complex to maintain for minimal benefit over a
  binary shared/private flag.
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0007-support-shared-and-private-token-declarations.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0007-support-shared-and-private-token-declarations.md
git commit -m "docs: add ADR-0007 support shared and private token declarations"
```

### Task 7: Write ADR-0008 — Provider-controlled trust model

**Files:**

- Create:
  `docs/adrs/0008-use-provider-controlled-trust-for-token-authorization.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0008-use-provider-controlled-trust-for-token-authorization.md`
with:

```markdown
---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Use provider-controlled trust for token authorization

## Context and problem statement

Requesters declare what tokens they want, but someone must decide what they're
actually allowed to have. If requesters control their own authorization, any
repo could escalate its own permissions. The trust model must ensure that a
central authority controls what tokens are issued.

## Decision outcome

The provider repo's configuration is the sole authority on what tokens
requesters can obtain. Requesters declare what they _want_; the provider decides
what they're _allowed_.

Provider permission rules specify:

- Which consumers (repos or accounts, matched by pattern) can request tokens
- For which target resources (all repos, specific repos, or no repos)
- With what permission levels

Requesters cannot escalate beyond what the provider allows. The provider has
veto power over every token request.

### Consequences

- Good, because a single repo controls the security policy for all token
  issuance.
- Good, because pattern-based rules scale to many requesters without
  per-requester configuration.
- Bad, because requesters depend on the provider to update rules when their
  needs change.

### Alternatives rejected

- **Requester-declared permissions with no central control**: insecure — any
  repo could request arbitrary permissions.
- **Transitive delegation chains**: hard to audit — trust flows through multiple
  intermediaries.
- **Per-token static allowlists**: inflexible — doesn't support pattern-based
  rules or scale to many requesters.
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0008-use-provider-controlled-trust-for-token-authorization.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0008-use-provider-controlled-trust-for-token-authorization.md
git commit -m "docs: add ADR-0008 use provider-controlled trust for token authorization"
```

### Task 8: Write ADR-0009 — Human-readable authorization explanations

**Files:**

- Create: `docs/adrs/0009-generate-human-readable-authorization-explanations.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0009-generate-human-readable-authorization-explanations.md`
with:

```markdown
---
status: accepted
date: 2024-10-14
decision-makers: ezzatron
---

# Generate human-readable authorization explanations

## Context and problem statement

The authorization rule system evaluates layered pattern matching across multiple
rules. When a token request is denied, the reason is not obvious from the config
alone — multiple rules may interact, and the final decision depends on which
patterns matched and what permissions they contributed. Without explanations,
debugging denied requests requires reading the authorization logic itself.

## Decision outcome

Every authorization decision produces a human-readable text explanation that
appears in the GitHub Actions log. The explanation describes:

- What was requested (token permissions, target repos, secret destinations)
- Whether it was allowed or denied
- Which rules matched and what they contributed
- Why the final decision was reached

Explanations are generated for both token authorization and provision
authorization decisions.

### Consequences

- Good, because denied requests are debuggable without reading the authorization
  logic.
- Good, because logs serve as an audit trail for security reviews.
- Bad, because explanations add verbosity to action logs.

### Alternatives rejected

- **Silent pass/fail**: no way to debug denied requests without reading source
  code.
- **Raw rule dumps**: show the matching rules but not how they combined to
  produce the decision — not human-readable.
- **Separate audit log system**: unnecessary complexity for an action that
  already runs in CI with built-in logging.
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0009-generate-human-readable-authorization-explanations.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0009-generate-human-readable-authorization-explanations.md
git commit -m "docs: add ADR-0009 generate human-readable authorization explanations"
```

### Task 9: Write ADR-0010 — Two-layer authorization

**Files:**

- Create: `docs/adrs/0010-separate-token-and-provision-authorization.md`

- [ ] **Step 1: Create the ADR file**

Create `docs/adrs/0010-separate-token-and-provision-authorization.md` with:

```markdown
---
status: accepted
date: 2025-02-03
decision-makers: ezzatron
---

# Separate token and provision authorization

## Context and problem statement

A requester's request involves two distinct questions: can it obtain a token
with certain permissions, and can it place that token as a secret in a
particular scope? Combining these into a single authorization check would mean
that granting token permissions implicitly grants provisioning rights, or vice
versa.

## Decision outcome

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

### Consequences

- Good, because providers can independently control token permissions and secret
  placement.
- Good, because the two checks mirror the two app roles (issuer and
  provisioner), keeping concerns separated.
- Bad, because providers must configure two sets of rules instead of one.

### Alternatives rejected

- **Single unified authorization**: can't independently control token
  permissions vs. secret placement — granting a token implicitly allows
  provisioning it anywhere.
- **Provision-only authorization**: can't restrict which tokens exist — any
  declared token would be created regardless of permissions policy.

## More information

- Related: [ADR-0008] — provider-controlled trust model defines the token
  authorization rules
- Related: [ADR-0011] — dual app roles align with the two authorization layers

[ADR-0008]: 0008-use-provider-controlled-trust-for-token-authorization.md
[ADR-0011]:
  0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0010-separate-token-and-provision-authorization.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0010-separate-token-and-provision-authorization.md
git commit -m "docs: add ADR-0010 separate token and provision authorization"
```

### Task 10: Write ADR-0011 — App registry with dual roles

**Files:**

- Create:
  `docs/adrs/0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md`

- [ ] **Step 1: Create the ADR file**

Create
`docs/adrs/0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md`
with:

```markdown
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
```

- [ ] **Step 2: Run Prettier**

Run:
`npm exec -- prettier --write docs/adrs/0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md`

Incorporate any formatting changes.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs/0011-use-dual-app-roles-for-token-issuance-and-secret-provisioning.md
git commit -m "docs: add ADR-0011 use dual app roles for token issuance and secret provisioning"
```
