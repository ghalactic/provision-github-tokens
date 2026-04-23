---
status: accepted
date: 2026-04-23
decision-makers: ezzatron
---

# Resolve permission patterns against requested permissions only

## Context and problem statement

With permission name patterns ([ADR-0002]), what set of permission names should
patterns be matched against? A hard-coded list of all GitHub permissions would
require ongoing maintenance and clutter authorization results with permissions
the requester never asked for.

[adr-0002]: 0002-use-two-tier-resolution-for-permission-name-patterns.md

## Decision outcome

Patterns resolve against the _requested_ permissions only — the set declared in
the requester's token declaration. `"*": write` requesting
`{contents: write, metadata: read}` resolves to
`{contents: write, metadata: write}`, not 30+ permissions.

The system is permission-name-agnostic. No hard-coded permission list exists or
is needed.

### Consequences

- Good, because new GitHub permissions work automatically — nothing to maintain.
- Good, because authorization results only contain relevant permissions.
- Bad, because providers can't proactively grant permissions the requester
  didn't ask for.

### Alternatives rejected

- **All known GitHub permissions**: requires maintaining a list, clutters
  results.
- **Installed app permissions**: requires an API call, results vary by app
  config.

## More information

- Related: [ADR-0002] — two-tier resolution for permission name patterns

[adr-0002]: 0002-use-two-tier-resolution-for-permission-name-patterns.md
