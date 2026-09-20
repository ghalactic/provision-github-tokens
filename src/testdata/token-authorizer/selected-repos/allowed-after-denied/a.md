- ✅ Account `account-x` was **allowed** access to a token:
  - ✅ **Write** access to repos in `account-a` requested with role `role-a`
  * ✅ 1 repo pattern matched 1 repo
  - ✅ **Sufficient** access to repo `account-a/repo-a` based on 2 rules:
    - ❌ Rule `#1` gave insufficient access:
      - ❌ _contents_: have `read`, wanted `write`
      - ✅ _metadata_: have `read`, wanted `read`
    - ✅ Rule `#2` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
      - ✅ _metadata_: have `read`, wanted `read`
