---
status: accepted
---

# Refuse provision collisions that write different content

Two requesters can declare the same secret name at the same **Provision
target**, and writes are upserts, so the last would silently win. A **Provision
collision** is any disagreement among those requests about what the consumer
would get — token shape, secret visibility, or name casing, matched
case-insensitively. Identical writes don't collide; they share one write and
outcome. When two or more allowed requests disagree, none writes, and every
participant is told, so fixing authorization can't reveal a second problem.
Collisions are provision failures, not run failures.
