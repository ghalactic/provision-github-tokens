- ❌ Repo `account-y/repo-y` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ❌ **Can't** provision token to **GitHub Actions** secret in `account-a/repo-a`:
    - ✅ Repo `account-a/repo-a` was **allowed** access to token `#1`
    - ❌  **Can't** provision secret (no matching rules)
