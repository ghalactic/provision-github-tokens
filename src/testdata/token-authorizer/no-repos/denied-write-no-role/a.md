- ❌ Account `account-x` was **denied** access to a token:
  - ❌ **Write** access to `account-a` requested without a role
  * ✅ **Sufficient** access to `account-a` based on 1 rule:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _repository_hooks_: have `write`, wanted `read`
      - ✅ _repository_projects_: have `admin`, wanted `write`
