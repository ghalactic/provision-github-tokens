- ❌ Repo `account-x/repo-x` was **denied** access to a token:
  - ✅ **Write** access to repos in `account-a` requested with role `role-a`
  * ✅ 1 repo pattern matched 3 repos
  - ✅ **Sufficient** access to repo `account-a/repo-a` based on 1 rule:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
  - ✅ **Sufficient** access to repo `account-a/repo-b` based on 1 rule:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
  - ❌ **Insufficient** access to repo `account-a/repo-y` (no matching rules)
