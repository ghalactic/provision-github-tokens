## Provisioned 2 secrets <a id="4bb7e3c2-provisioned-2-secrets"></a>

### Secret provisioning <a id="4bb7e3c2-secret-provisioning"></a>

#### account-x/repo-x <a id="4bb7e3c2-account-xrepo-x"></a>

##### SECRET\_A <a id="4bb7e3c2-secret_a"></a>

<details>
<summary>✅ Repo account-x/repo-x was allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in account-a:
  - ✅ Account account-a was allowed access to [token #1](#user-content-4bb7e3c2-token-1--account-a-all-repos)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

###### Uses [token #1](#user-content-4bb7e3c2-token-1--account-a-all-repos) <a id="4bb7e3c2-uses-token-1"></a>

#### account-y/repo-y <a id="4bb7e3c2-account-yrepo-y"></a>

##### SECRET\_B <a id="4bb7e3c2-secret_b"></a>

<details>
<summary>✅ Repo account-y/repo-y was allowed to provision secret SECRET_B</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in account-a:
  - ✅ Account account-a was allowed access to [token #1](#user-content-4bb7e3c2-token-1--account-a-all-repos)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

###### Uses [token #1](#user-content-4bb7e3c2-token-1--account-a-all-repos) <a id="4bb7e3c2-uses-token-1-1"></a>

### Token issuing <a id="4bb7e3c2-token-issuing"></a>

#### account-a <a id="4bb7e3c2-account-a"></a>

##### Token #1 — account-a (all repos) <a id="4bb7e3c2-token-1--account-a-all-repos"></a>

<details>
<summary>✅ Account account-a was allowed access to a token</summary>

- ✅ Read access to all repos in account-a requested without a role
- ✅ Sufficient access to all repos in account-a based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ metadata: have read, wanted read

</details>

###### Used by <a id="4bb7e3c2-used-by"></a>

- [`SECRET_A`](#user-content-4bb7e3c2-secret_a) (account-x/repo-x)
- [`SECRET_B`](#user-content-4bb7e3c2-secret_b) (account-y/repo-y)
