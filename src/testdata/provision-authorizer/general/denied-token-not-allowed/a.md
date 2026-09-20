- ❌ Repo `account-x/repo-x` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-y/repo-y.token-y`
  * ❌ **Can't** provision token to **GitHub Actions** secret in `account-a`:
    - ❌ Account `account-a` was **denied** access to token `#1`
    - ✅  **Can** provision secret based on 1 rule:
      - ✅ **Allowed** by rule `#1`
  * ❌ **Can't** provision token to **GitHub Actions** secret in `account-a/repo-a`:
    - ❌ Repo `account-a/repo-a` was **denied** access to token `#2`
    - ✅  **Can** provision secret based on 1 rule:
      - ✅ **Allowed** by rule `#1`
