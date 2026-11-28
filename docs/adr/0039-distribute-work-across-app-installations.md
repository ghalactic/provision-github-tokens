---
status: accepted
---

# Distribute work across app installations

Several installations can apply to the same unit of work, but selection used the
first and ignored the rest, so app choice followed configuration order.

Selection uses rendezvous hashing: each unit of work has a stable key, and
candidates are scored on it so the full descending order is the preference
order, independent of input order. Adding or removing an app moves only the work
it wins or loses. All work that can be distributed safely walks that order,
failing over on any error once per candidate, above the Octokit retry plugin and
with no in-run blacklist.

Successes record the installation used and the failures before it; `FAILED`
records every attempt; identity is logged only as `::debug::` before each
attempt. Fallback rows show ⚠️ instead of ✅, with a footnote pointing at debug
logging. Capability filtering is deferred to [#168].

[#168]: https://github.com/ghalactic/provision-github-tokens/issues/168
