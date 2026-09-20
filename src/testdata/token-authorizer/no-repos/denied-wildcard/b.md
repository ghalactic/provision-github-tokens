- ❌ Repo `account-x/repo-x` was **denied** access to a token:
  - ✅ **Read** access to `account-a` requested with role `role-a`
  * ❌ **Insufficient** access to `account-a` based on 2 rules:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _metadata_: have `read`, wanted `read`
    - ❌ Rule `#2` gave insufficient access:
      - ❌ _metadata_: have `none`, wanted `read`
