---
status: accepted
---

# Generate human-readable authorization explanations

Every token and provision authorization decision produces a human-readable text
explanation in the GitHub Actions log: what was requested, whether it was
allowed or denied, which rules matched and what they contributed, and why the
final decision was reached. This makes denied requests debuggable without
reading the authorization logic and doubles as an audit trail for security
reviews. The cost is added log verbosity; raw rule dumps were rejected because
they show matches without the combination logic that produced the decision.
