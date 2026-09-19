---
status: accepted
---

# Report provisioning failures via token dashboards in requester repos

Provisioning failures, authorization denials, and invalid requester configs were
only visible in the provider's job summary and logs, so requesters never learned
their tokens failed. Each run now maintains one persistent issue per requester
repo — a token dashboard — listing that repo's current failures with full
Markdown explanations (not the summary's terse table), refreshed from each run's
results and closed with an explanatory comment once nothing is failing or
dashboards are turned off. Dashboards are anchored by a `gh-token-dashboard`
label, never reopened after a human or the action closes them (a fresh issue is
opened instead), enabled by default with per-repo opt-out, and posted by the
discovering provisioner app using `issues: write`, skipping with a warning any
repo where that permission is missing. Stale dashboards for repos that stop
being requesters are left in place rather than tracked across runs.
