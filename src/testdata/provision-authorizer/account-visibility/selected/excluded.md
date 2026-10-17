- ❌ Repo `account-a/repo-a` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.tokenA`
  * ❌ **Can't** provision token to **GitHub Actions** secret in account `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅ **Can** provision to **selected repos** based on 1 rule:
      - ✅ **Allowed** by rule `#1`
    - ✅ **Can** provision secret to **private** repo `account-a/repo-x`:
      - ✅ **Allowed** by rule `#2`
    - ❌ **Can't** provision secret to **public** repo `account-a/repo-y`:
      - ❌ **Can't** provision secret (no matching rules)
