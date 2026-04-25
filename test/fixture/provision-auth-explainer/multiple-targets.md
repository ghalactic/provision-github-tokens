<details>
<summary>✅ Repo account-x/repo-x was allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in account-a:
  - ✅ Account account-a was allowed access to [token #1](#pgt-test-token-1)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1
- ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #2](#pgt-test-token-2)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1
- ✅ Can provision token to GitHub Codespaces secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #2](#pgt-test-token-2)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1
- ✅ Can provision token to Dependabot secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #2](#pgt-test-token-2)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1
- ✅ Can provision token to GitHub environment staging secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #2](#pgt-test-token-2)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>
