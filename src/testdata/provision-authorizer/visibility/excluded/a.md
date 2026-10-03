- ❌ Repo `account-a/repo-a` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ❌ **Can't** provision token to **GitHub Actions** secret in **public** repo `account-a/repo-target`:
    - ✅ Repo `account-a/repo-target` was **allowed** access to token `#1`
    - ❌  **Can't** provision secret (no matching rules)
