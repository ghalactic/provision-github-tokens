- ❌ Repo `account-x/repo-x` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ❌ **Can't** provision token to **Dependabot** secret in `account-y`:
    - ✅ Account `account-y` was **allowed** access to token `#2`
    - ❌  **Can't** provision secret (no matching rules)
