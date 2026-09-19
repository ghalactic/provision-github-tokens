---
status: accepted
---

# Support shared and private token declarations

Token declarations carry a sharing flag: **private** (default) is usable only by
the declaring repo, **shared** can be referenced by any requester. Declarations
are identified by `{owner/repo}.{name}` and the registry checks the flag when a
reference comes from outside the declaring repo. This supports both
self-contained repos and a central repo defining reusable declarations, while
private-by-default prevents accidental exposure. All-shared would cause
namespace conflicts; per-requester access lists add complexity for minimal
benefit.
