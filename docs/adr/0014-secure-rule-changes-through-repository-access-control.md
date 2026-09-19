---
status: accepted
---

# Secure rule changes through repository access control

Permission and provision rules live in a dedicated provider repository, and who
can change them is enforced by that repository's existing access controls and
code review rather than a custom authorization layer. Requesting teams control
their own declarations (what they _want_) but submit pull requests for rule
changes (what they're _allowed_), with the owning team reviewing and the commit
log providing the audit trail. This assumes the provider repo has stricter write
access than the requesting repos; a misconfigured provider repo would undermine
the model. In-app authorization and out-of-band rule management were rejected as
reimplementing what Git and GitHub already provide.
