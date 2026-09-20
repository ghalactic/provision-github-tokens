- ✅ Account `account-x` was **allowed** access to a token:
  - ✅ **Write** access to **all repos** in `account-a` requested with role `role-a`
  * ✅ **Sufficient** access to **all repos** in `account-a` based on 2 rules:
    - ❌ Rule `#1` gave insufficient access:
      - ❌ _contents_: have `read`, wanted `write`
    - ✅ Rule `#2` gave sufficient access:
      - ✅ _contents_: have `write`, wanted `write`
