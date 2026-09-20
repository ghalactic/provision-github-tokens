- ❌ Repo `account-y/repo-y` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ❌ **Can't** provision token to **Dependabot** secret in `account-x/repo-x`:
    - ✅ Repo `account-x/repo-x` was **allowed** access to token `#1`
    - ❌  **Can't** provision secret (no matching rules)
