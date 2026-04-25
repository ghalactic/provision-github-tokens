## Provisioned 0 of 1 secret

### Failures

#### account-x/repo-x

- ❌ [`SECRET_A`](#pgt-test-account-xrepo-x--secret_a)

### Secret provisioning

#### account-x/repo-x

##### SECRET\_A

<a id="pgt-test-account-xrepo-x--secret_a"></a>

<details>
<summary>❌ Not provisioned — 1 target denied</summary>

- ❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET\_A:
  - ✅ Can use token declaration account-a/repo-a.tokenA
  - ❌ Can't provision token to GitHub Actions secret in account-a:
    - ❌ Account account-a was denied access to [token #1](#pgt-test-token-1)
    - ❌ Can't provision secret (no matching rules)

</details>

### Token issuing

#### account-a

##### Token for account-a (all repos)

<a id="pgt-test-token-1"></a>

Used by:

- [`SECRET_A`](#pgt-test-account-xrepo-x--secret_a) (account-x/repo-x)

<details>
<summary>❌ Denied</summary>

- ❌ Account account-a was denied access to a token:
  - ❌ Admin access to all repos in account-a requested without a role
  - ❌ Insufficient access to all repos in account-a based on 1 rule:
    - ❌ Rule #1: "\<description>" gave insufficient access:
      - ❌ contents: have none, wanted admin

</details>
