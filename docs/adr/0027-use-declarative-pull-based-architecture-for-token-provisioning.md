---
status: accepted
---

# Use declarative pull-based architecture for token provisioning

Requesters declare what tokens they need in config files within their own repos;
the action discovers requesters, authorizes against provider policy, and
provisions tokens in a single run. Onboarding a new requester is adding a config
file, and ownership maps to existing repo boundaries rather than a central
directory with growing CODEOWNERS rules. Centralized per-requester workflows and
an external service were rejected as adding central-repo churn or infrastructure
that GitHub Actions already handles.
