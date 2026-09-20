- ✅ Repo `account-x/repo-x` was **allowed** access to a token:
  - ✅ **Write** access to **all repos** in `account-a` requested with role `role-a`
  * ✅ **Sufficient** access to **all repos** in `account-a` based on 2 rules:
    - ❌ Rule `#1` gave insufficient access:
      - ❌ _contents_: have `read`, wanted `write`
      - ✅ _metadata_: have `read`, wanted `read`
    - ✅ Rule `#2` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
      - ✅ _metadata_: have `read`, wanted `read`
