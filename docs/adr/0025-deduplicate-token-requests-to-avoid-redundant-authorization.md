---
status: accepted
---

# Deduplicate token requests to avoid redundant authorization

Multiple provision requests can resolve to token requests with the same
consumer, declaration (including role), and resolved repos. Those requests are
normalized and cached by their full shape, so identical requests share a single
token request object that is authorized and issued exactly once. The
deduplication is implicit — there's no configuration surface for controlling
which requests merge.
