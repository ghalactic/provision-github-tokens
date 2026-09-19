## `SECRET_A`

- ✅ Repo account-x/repo-x was allowed to provision secret SECRET\_A:
  - ✅ Can use token declaration account-a/repo-a.token-a
  - ✅ Can provision token to GitHub Actions secret in account-a:
    - ✅ Account account-a was allowed access to token #1
    - ✅ Can provision secret (no matching rules)
- ❌ Failed to create write token with access to all repos in account-a:
  - ❌ No suitable issuer
  - ➖ Wanted write access without a role
  - ➖ Wanted access to all repos in account-a
  - ➖ Wanted 1 permission:
    - ➖ contents: write
- ❌ Secret SECRET\_A wasn't provisioned for repo account-x/repo-x:
  - ❌ Token wasn't created for GitHub Actions secret in account-a

[Full logs for this run](https://github.example.com/account-x/repo-x/actions/runs/42)
