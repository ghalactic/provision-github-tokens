---
status: accepted
---

# Refuse provision collisions that write different content

Two requesters can declare the same secret name at the same **Provision
target**, and writes are upserts, so the last would silently win. A **Provision
collision** is any disagreement among those requests about what the consumer
would get — token shape, secret visibility, or name casing, matched
case-insensitively. When two or more writable requests disagree, none writes;
identical writes share one write and outcome. With fewer than two writable
requests the collision is potential: reported only to non-writers and never
blocking. Collisions are provision failures, not run failures.
