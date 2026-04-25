## Provisioned 2 secrets

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

##### SECRET\_B <a id="pgt-4bb7e3c2-account-xrepo-x--secret_b"></a>

Uses [token #1](#pgt-4bb7e3c2-token-1)

<details>
<summary>✅ Repo account-x/repo-x was allowed to provision secret SECRET_B</summary>

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
- [`SECRET_B`](#pgt-4bb7e3c2-account-xrepo-x--secret_b) (account-x/repo-x)

<details>
<summary>✅ Account account-a was allowed access to a token</summary>

- ✅ Read access to all repos in account-a requested without a role
- ✅ Sufficient access to all repos in account-a based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ metadata: have read, wanted read

</details>
