## `SECRET_A`

- ✅ Repo account-x/repo-x was allowed to provision secret SECRET\_A:
  - ✅ Can use token declaration account-a/repo-a.token-a
  - ✅ Can provision token to GitHub Actions secret in account-a:
    - ✅ Account account-a was allowed access to token #1
    - ✅ Can provision secret (no matching rules)
- ✅ Read-only token created with access to all repos in account-a:
  - ✅ Has read access without a role
  - ✅ Has access to all repos in account-a
  - ✅ Has 1 permission:
    - ✅ contents: read
- ✅ Secret SECRET\_A was provisioned for repo account-x/repo-x:
  - ✅ Provisioned to GitHub Actions secret in account-a

## `SECRET_B`

- ✅ Repo account-x/repo-x was allowed to provision secret SECRET\_B:
  - ✅ Can use token declaration account-a/repo-a.token-b
  - ✅ Can provision token to GitHub Actions secret in account-a:
    - ✅ Account account-a was allowed access to token #1
    - ✅ Can provision secret (no matching rules)
  - ✅ Can provision token to GitHub Actions secret in account-b:
    - ✅ Account account-a was allowed access to token #1
    - ✅ Can provision secret (no matching rules)
- ✅ Read-only token created with access to all repos in account-a:
  - ✅ Has read access without a role
  - ✅ Has access to all repos in account-a
  - ✅ Has 1 permission:
    - ✅ contents: read
- ❌ Secret SECRET\_B was partially provisioned for repo account-x/repo-x:
  - ✅ Provisioned to GitHub Actions secret in account-a
  - ❌ Failed to provision to GitHub Actions secret in account-b: 500 - boom

[Full logs for this run](https://github.example.com/account-x/repo-x/actions/runs/42)
