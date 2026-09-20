- ❌ Account `account-x` was **denied** access to a token:
  - ✅ **Write** access to `account-a` requested with role `role-a`
  * ❌ **Insufficient** access to `account-a` based on 2 rules:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
    - ❌ Rule `#2` gave insufficient access:
      - ❌ _contents_: have `none`, wanted `write`
