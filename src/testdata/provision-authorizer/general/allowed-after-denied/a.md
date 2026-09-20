- ✅ Repo `account-x/repo-x` **was allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-y/repo-y.token-y`
  * ✅ **Can** provision token to **GitHub Actions** secret in `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅  **Can** provision secret based on 2 rules:
      - ❌ **Denied** by rule `#1`
      - ✅ **Allowed** by rule `#2`
