- ❌ Account `account-x` was **denied** access to a token:
  - ❌ **Admin** access to **all repos** in `account-a` requested without a role
  * ✅ **Sufficient** access to **all repos** in `account-a` based on 1 rule:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _repository_hooks_: have `write`, wanted `write`
      - ✅ _repository_projects_: have `admin`, wanted `admin`
