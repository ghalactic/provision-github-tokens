- ❌ Repo `account-x/repo-x` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ❌ **Can't** provision token to **GitHub environment** `env-a` secret in `account-a/repo-a`:
    - ✅ Repo `account-a/repo-a` was **allowed** access to token `#1`
    - ❌  **Can't** provision secret based on 1 rule:
      - ❌ **Denied** by rule `#1`
