---
status: accepted
---

# Express account secret visibility in the requester config

GitHub's account-secret endpoints take a `visibility` of `all`, `private`, or
`selected`, plus `selected_repository_ids` when `selected`; the action hardcoded
`all`. Each account secret type in a requester config now takes `private`,
`all`, or a list of repo-name patterns meaning `selected`, resolved within the
target account. `private` is the recommended value and GitHub's own default.

Account secret types no longer accept `true`: it would silently mean `all`.
`false` remains as an explicit opt-out that vetoes the type for an account, even
when another matching pattern enables it; omitting the type only opts out when
no other matching pattern enables it. An empty `selected` list is allowed,
matching GitHub. Whether GitHub's `private` includes internal repos is
undocumented; the value is passed through unchanged.
