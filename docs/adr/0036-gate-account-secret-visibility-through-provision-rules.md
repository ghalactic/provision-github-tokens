---
status: accepted
---

# Gate account secret visibility through provision rules

**Secret visibility** is a requester-chosen reader set, not a repository
classification, so ADR-0034's account-target exemption no longer holds. Each
account secret type carries four optional decisions — `allRepos`,
`privateRepos`, `selectedRepos`, `noRepos`, each `allow` or `deny` — and the
requester's chosen visibility selects the category, resolved by the existing
rule ordering and defaults (ADR-0015, ADR-0018). `allRepos`, `privateRepos`, and
`noRepos` are toggles; `selectedRepos` is a gate that also requires every named
repo to be authorized as a repo target, so repo-visibility gating (ADR-0034)
still applies wherever a concrete repo is named. An explicitly empty selection
is `noRepos`; a non-empty selection that resolves to no repos is denied rather
than falling back to it. Bounding readership by a token declaration's
repositories was rejected, because a declaration says what the token grants —
unrelated to who may read it.
