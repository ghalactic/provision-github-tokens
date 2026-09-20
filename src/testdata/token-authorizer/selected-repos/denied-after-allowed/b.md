- ❌ Repo `account-x/repo-x` was **denied** access to a token:
  - ✅ **Write** access to repos in `account-a` requested with role `role-a`
  * ✅ 1 repo pattern matched 1 repo
  - ❌ **Insufficient** access to repo `account-a/repo-a` based on 2 rules:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
    - ❌ Rule `#2` gave insufficient access:
      - ❌ _contents_: have `read`, wanted `write`
