## Provisioned 1 secret

### Secret provisioning

#### account-x/repo-x

##### SECRET\_A <a id="pgt-test-account-xrepo-x--secret_a"></a>

<details>
<summary>✅ Provisioned to 3 targets</summary>

- ✅ Repo account-x/repo-x was allowed to provision secret SECRET\_A:
  - ✅ Can use token declaration account-a/repo-a.tokenA
  - ✅ Can provision token to GitHub Actions secret in account-a/repo-a:
    - ✅ Repo account-a/repo-a was allowed access to [token #1](#pgt-test-token-1)
    - ✅ Can provision secret based on 1 rule:
      - ✅ Allowed by rule #1
  - ✅ Can provision token to GitHub environment production secret in account-a/repo-a:
    - ✅ Repo account-a/repo-a was allowed access to [token #1](#pgt-test-token-1)
    - ✅ Can provision secret based on 1 rule:
      - ✅ Allowed by rule #1
  - ✅ Can provision token to GitHub environment staging secret in account-a/repo-a:
    - ✅ Repo account-a/repo-a was allowed access to [token #1](#pgt-test-token-1)
    - ✅ Can provision secret based on 1 rule:
      - ✅ Allowed by rule #1

</details>

### Token issuing

#### account-a/repo-a

##### Token for account-a (all repos) <a id="pgt-test-token-1"></a>

Used by:

- [`SECRET_A`](#pgt-test-account-xrepo-x--secret_a) (account-x/repo-x)

<details>
<summary>✅ Allowed — read access</summary>

- ✅ Repo account-a/repo-a was allowed access to a token:
  - ✅ Read access to all repos in account-a requested without a role
  - ✅ Sufficient access to all repos in account-a based on 1 rule:
    - ✅ Rule #1: "\<description>" gave sufficient access:
      - ✅ metadata: have read, wanted read

</details>
