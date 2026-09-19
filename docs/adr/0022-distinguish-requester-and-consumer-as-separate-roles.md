---
status: accepted
---

# Distinguish requester and consumer as separate roles

A **requester** is the repo that contains a config declaring what tokens it
needs and where they should be provisioned as secrets; a **consumer** is the
repo or account that actually receives the issued token — possibly the requester
itself, possibly a different repo the requester nominated as a provisioning
target. The `consumers` field in permission rules matches against the consuming
repos. Two distinct terms avoid the confusion of using "consumer" for both
sides; the flip side is they must be used precisely or the ambiguity returns.
