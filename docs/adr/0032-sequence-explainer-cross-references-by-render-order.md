---
status: accepted
---

# Sequence explainer cross-references by render order

Explainers number the results they cross-reference ("token #N", "same result as
token #N") by render order, using a shared one-based sequencer that hands each
object its number on first render. A filtered subset can then be explained
without renumbering or cloning results, and a number stays stable across
repeated references within a view. Rule numbers remain config-relative and
embedded in the rule result: filtering results never changes a rule's position
in the provider config, so it never needs renumbering. Passing the canonical
result lists in instead was rejected because it leaks context to readers who may
not have access to the full result set.
