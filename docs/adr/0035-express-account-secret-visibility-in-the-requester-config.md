---
status: accepted
---

# Express account secret visibility in the requester config

GitHub's account-secret endpoints take a `visibility` of `all`, `private`, or
`selected`, plus `selected_repository_ids` when `selected`; the action hardcoded
`all`. Each account secret type in a requester config now takes `private`,
`all`, or a list of repo-name patterns meaning `selected`, resolved within the
target account, and omitting the type opts out. `private` is the recommended
value and GitHub's own default.

Account secret types no longer accept booleans: `false` duplicated omission, and
`true` would silently mean `all`. The change is in place on
`requester.v1.schema.json`; nothing is released, so no migration is needed. An
empty `selected` list is allowed, matching GitHub. Whether GitHub's `private`
includes internal repos is undocumented; the value is passed through unchanged.
