- ❌ Repo `account-x/repo-x` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-y/repo-y.token-y`
  * ❌ **Can't** provision token to **GitHub Actions** secret in `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ❌  **Can't** provision secret based on 2 rules:
      - ✅ **Allowed** by rule `#1`
      - ❌ **Denied** by rule `#2`
