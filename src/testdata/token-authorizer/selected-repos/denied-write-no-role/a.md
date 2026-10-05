- ❌ Account `account-x` was **denied** access to a token:
  - ❌ **Write** access to repos in `account-a` requested without a role
  * ✅ 1 repo pattern matched 1 repo
  - ✅ **Sufficient** access to **private** repo `account-a/repo-a` based on 1 rule:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _repository_hooks_: have `write`, wanted `read`
      - ✅ _repository_projects_: have `admin`, wanted `write`
