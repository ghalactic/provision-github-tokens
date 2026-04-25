## Provisioned 1 secret

### Secret provisioning

#### account-x/repo-x

##### SECRET\_A <a id="pgt-4bb7e3c2-account-xrepo-x--secret_a"></a>

<details>
<summary>✅ Repo account-x/repo-x was allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #1](#pgt-4bb7e3c2-token-1)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1
- ✅ Can provision token to GitHub environment production secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #1](#pgt-4bb7e3c2-token-1)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1
- ✅ Can provision token to GitHub environment staging secret in account-a/repo-a:
  - ✅ Repo account-a/repo-a was allowed access to [token #1](#pgt-4bb7e3c2-token-1)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

###### Uses [token #1](#pgt-4bb7e3c2-token-1)

### Token issuing

#### account-a/repo-a

##### Token #1 — account-a (all repos) <a id="pgt-4bb7e3c2-token-1"></a>

<details>
<summary>✅ Repo account-a/repo-a was allowed access to a token</summary>

- ✅ Read access to all repos in account-a requested without a role
- ✅ Sufficient access to all repos in account-a based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ metadata: have read, wanted read

</details>

###### Used by

- [`SECRET_A`](#pgt-4bb7e3c2-account-xrepo-x--secret_a) (account-x/repo-x)
