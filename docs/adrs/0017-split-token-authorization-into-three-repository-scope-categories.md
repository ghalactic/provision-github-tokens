---
status: accepted
date: 2024-12-13
decision-makers: ezzatron
---

# Split token authorization into three repository-scope categories

## Context and problem statement

GitHub installation access tokens can be scoped to all repositories, a selected
set of repositories, or no repositories at all. These scopes have fundamentally
different authorization characteristics.

A critical constraint is that GitHub's permission model does not scope
permissions to individual repositories. When a token is granted a permission,
that permission applies at the account level — even when the token is restricted
to selected repositories. The token can only _access_ those selected repos, but
the permission itself is granted account-wide. This means granting a permission
to a token has broader implications than it might appear, and the authorization
system must account for this.

## Decision outcome

Token authorization is split into three distinct categories based on the
requested repository scope:

- **All repos** — the token can access all current and future repositories in
  the account. Authorization evaluates a single set of permissions against the
  rules.
- **Selected repos** — the token can access a specific set of repositories.
  Authorization evaluates permissions per-repo, and all requested repos must be
  independently authorized for the token to be issued.
- **No repos** — the token has no repository access. This category exists for
  tokens that only need account-level capabilities, such as read-only access to
  public data with a higher rate limit, or managing organization settings
  without any repository access.

Each category has its own matching criteria in permission rules. A rule can
specify whether it applies to all-repos requests, no-repos requests, specific
repo patterns, or any combination. This lets providers write rules that
distinguish between "this consumer can read all repos" and "this consumer can
read these specific repos" — which have different security implications despite
involving the same permission.

### Consequences

- Good, because providers can set different permission policies for different
  repository scopes, reflecting the different risk profiles of each.
- Good, because the no-repos category supports account-level-only tokens without
  granting any repository access.
- Good, because selected-repos authorization is per-repo, so a single
  unauthorized repo prevents the entire token from being issued rather than
  silently omitting it.
- Bad, because providers must understand the three categories and configure
  rules for each scope they want to support.

### Alternatives rejected

- **Single authorization path for all scopes**: can't distinguish between
  all-repos and selected-repos requests, which have very different security
  implications. Granting write access for selected repos is a narrower decision
  than granting it for all repos, even though GitHub applies the permission
  account-wide in both cases.
- **Ignore repository scope in authorization**: would allow a consumer
  authorized for specific repos to request an all-repos token instead, bypassing
  the intended restrictions.
- **Automatically downgrade scope**: would silently change the requester's
  intent, leading to unexpected behavior in downstream workflows.
