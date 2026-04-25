## Provisioned 1 secret

### Secret provisioning

#### account-x/repo-x

##### SECRET\_A <a id="pgt-4bb7e3c2-account-xrepo-x--secret_a"></a>

Uses [token #1](#pgt-4bb7e3c2-token-1)

<details>
<summary>✅ Repo account-x/repo-x was allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in account-a:
  - ✅ Account account-a was allowed access to [token #1](#pgt-4bb7e3c2-token-1)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

### Token issuing

#### account-a

##### Token #1 — account-a (all repos) <a id="pgt-4bb7e3c2-token-1"></a>

Used by:

- [`SECRET_A`](#pgt-4bb7e3c2-account-xrepo-x--secret_a) (account-x/repo-x)

<details>
<summary>✅ Account account-a was allowed access to a token</summary>

- ✅ Write access to all repos in account-a requested with role writer
- ✅ Sufficient access to all repos in account-a based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ contents: have write, wanted write

</details>
