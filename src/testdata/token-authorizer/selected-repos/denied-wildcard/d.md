- ❌ Repo `account-x/repo-x` was **denied** access to a token:
  - ✅ **Read** access to repos in `account-b` requested with role `role-a`
  * ✅ 1 repo pattern matched 1 repo
  - ❌ **Insufficient** access to repo `account-b/repo-b` based on 2 rules:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _metadata_: have `read`, wanted `read`
    - ❌ Rule `#2` gave insufficient access:
      - ❌ _metadata_: have `none`, wanted `read`
