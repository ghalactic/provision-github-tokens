## `SECRET_A`

- ✅ Repo org-a/repo-a was allowed to provision secret SECRET\_A:
  - ✅ Can use token declaration org-a/repo-a.token-a
  - ✅ Can provision token to GitHub Actions secret in org-a:
    - ✅ Account org-a was allowed access to token #1
    - ✅ Can provision secret (no matching rules)
- ❌ Failed to create write token with access to all repos in account-a:
  - ❌ No suitable issuer
  - ➖ Wanted write access without a role
  - ➖ Wanted access to all repos in account-a
  - ➖ Wanted 1 permission:
    - ➖ contents: write
- ❌ Secret SECRET\_A wasn't provisioned for repo org-a/repo-a:
  - ❌ Token wasn't created for GitHub Actions secret in org-a

[Full logs for this run](https://github.example.com/org-a/repo-a/actions/runs/42)
