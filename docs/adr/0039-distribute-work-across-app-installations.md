---
status: accepted
---

# Distribute work across app installations

Several installations can apply to the same token shape or provision target, but
selection used the first and ignored the rest, so app choice followed
configuration order.

Selection uses rendezvous hashing: issuers hash the token shape, provisioners
hash the provision target's location, not its secret type, and candidates are
scored so the full descending order is the preference order, independent of
input order. Adding or removing an app moves only the work it wins or loses.
Creation and provisioning walk that order, failing over on any error once per
candidate, above the Octokit retry plugin and with no in-run blacklist.

Successes record the installation used (`issuer` or `provisioner`) and the
failures before it; `FAILED` records every attempt; identity is logged only as
`::debug::` before each attempt. Fallback rows show ⚠️ instead of ✅, with a
footnote pointing at debug logging. Capability filtering is deferred to [#168].

[#168]: https://github.com/ghalactic/provision-github-tokens/issues/168
