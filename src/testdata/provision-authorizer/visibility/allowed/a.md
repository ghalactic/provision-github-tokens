- ✅ Repo `account-a/repo-a` **was allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ✅ **Can** provision token to **GitHub Actions** secret in **private** repo `account-a/repo-target`:
    - ✅ Repo `account-a/repo-target` was **allowed** access to token `#1`
    - ✅  **Can** provision secret based on 1 rule:
      - ✅ **Allowed** by rule `#1`
