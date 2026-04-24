---
status: accepted
date: 2025-02-03
decision-makers: ezzatron
---

# Default to the defining repository's account and support self-targeting

## Context and problem statement

The most common provisioning scenario is a repository requesting a token and
placing it as a secret in its own repo. Without any shortcuts, every token
declaration would need to explicitly specify the account it belongs to, and
every provision target would need to spell out the full repo owner and name —
even when they match the requesting repo. This boilerplate adds noise and
increases the chance of misconfiguration.

## Decision

Several defaults and shortcuts reduce configuration for common cases:

- **Implicit account**: when a token declaration omits the account, it defaults
  to the account of the repository where the requester configuration is defined.
  This eliminates the most common field in token declarations.
- **Self-targeting fields**: provision rules have dedicated fields for targeting
  the requesting repo's own repository and account, separate from the
  pattern-based fields used for cross-repo provisioning. This makes "provision
  to self" a first-class concept rather than a special case of pattern matching.
- **Self-targets override patterns**: when a provision rule includes both
  pattern-based targets and a self-target, the self-target can override the
  pattern result. This lets providers write broad deny rules with a carve-out
  for self-provisioning, without needing separate rules.

## Consequences

- Good, because the simplest and most common case (provision a secret to your
  own repo) requires the least configuration.
- Good, because self-targeting is explicit in the configuration rather than
  implied by a pattern that happens to match.
- Good, because self-target overrides avoid the need for extra rules to permit
  self-provisioning alongside broad restrictions.
- Bad, because the interaction between self-targets and pattern-based targets
  adds a layer of resolution that providers need to understand.

## Alternatives considered

- **No defaults — require explicit values everywhere**: unnecessarily verbose
  for the most common case and increases risk of copy-paste errors.
- **Pattern-only targeting**: self-provisioning would depend on writing patterns
  that happen to match the requesting repo, which is fragile and doesn't express
  intent clearly.
- **Separate self-provisioning rules**: would require providers to write
  additional rules for a case that should be straightforward, increasing
  configuration size.
