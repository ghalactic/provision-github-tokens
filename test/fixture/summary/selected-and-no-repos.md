## Provisioned 1 of 2 secrets

### Failures

#### account-x/repo-x

- ❌ [`SECRET_SELECTED`](#pgt-test-account-xrepo-x--secret_selected)

### Secret provisioning

#### account-x/repo-x

##### SECRET\_NO\_REPOS <a id="pgt-test-account-xrepo-x--secret_no_repos"></a>

<details>
<summary>✅ Provisioned to 1 target</summary>

- ✅ Repo account-x/repo-x was allowed to provision secret SECRET\_NO\_REPOS:
  - ✅ Can use token declaration account-a/repo-a.tokenA
  - ✅ Can provision token to GitHub Actions secret in account-a:
    - ✅ Account account-a was allowed access to [token #2](#pgt-test-token-2)
    - ✅ Can provision secret based on 1 rule:
      - ✅ Allowed by rule #1

</details>

##### SECRET\_SELECTED <a id="pgt-test-account-xrepo-x--secret_selected"></a>

<details>
<summary>❌ Not provisioned — 1 target denied</summary>

- ❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET\_SELECTED:
  - ✅ Can use token declaration account-a/repo-a.tokenA
  - ❌ Can't provision token to GitHub Actions secret in account-a:
    - ❌ Account account-a was denied access to [token #1](#pgt-test-token-1)
    - ✅ Can provision secret based on 1 rule:
      - ✅ Allowed by rule #1

</details>

### Token issuing

#### account-a

##### Token for account-a (no repos) <a id="pgt-test-token-1"></a>

Used by:

- [`SECRET_SELECTED`](#pgt-test-account-xrepo-x--secret_selected) (account-x/repo-x)

<details>
<summary>❌ Denied</summary>

- ❌ Account account-a was denied access to a token:
  - ❌ Write access to repos in account-a requested without a role
  - ❌ 1 repo pattern matched 0 repos

</details>

##### Token for account-a (no repos) <a id="pgt-test-token-2"></a>

Used by:

- [`SECRET_NO_REPOS`](#pgt-test-account-xrepo-x--secret_no_repos) (account-x/repo-x)

<details>
<summary>✅ Allowed — read access</summary>

- ✅ Account account-a was allowed access to a token:
  - ✅ Read access to account-a requested without a role
  - ✅ Sufficient access to account-a based on 1 rule:
    - ✅ Rule #1: "\<description>" gave sufficient access:
      - ✅ members: have read, wanted read

</details>
