---
status: accepted
---

# Gate authorization on repository visibility

Permission and provision rules can match a repository's visibility — `private`,
`internal`, or `public`, ordered most to least restricted — and matching is
cumulative: a rule applies at or below its rank, so `internal` covers private
repos too. An omitted visibility means `private`, so a rule that forgets it
fails closed. Visibility is a match gate only, leaving last-rule-wins
(ADR-0015), min-wins (ADR-0029), and deny-wins / deny-by-default (ADR-0018)
intact. It is expressible only where the config names a concrete repo —
selected-repo criteria and repo provision targets — because all-repos and
account-only criteria cannot promise anything about future repos and stay
all-visibility by construction. The authorizers read `repo.visibility` from repo
data discovery already fetched, looked up through the repo registry; a
registered repo without a visibility is an invariant failure, since GitHub
always populates it.
