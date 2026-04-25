## Provisioned 0 of 1 secret <a id="4bb7e3c2-provisioned-0-of-1-secret"></a>

### Failures <a id="4bb7e3c2-failures"></a>

#### account-x/repo-x <a id="4bb7e3c2-account-xrepo-x"></a>

- ❌ [`SECRET_A`](#user-content-4bb7e3c2-secret_a)

### Secret provisioning <a id="4bb7e3c2-secret-provisioning"></a>

#### account-x/repo-x <a id="4bb7e3c2-account-xrepo-x-1"></a>

##### SECRET\_A <a id="4bb7e3c2-secret_a"></a>

<details>
<summary>❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ❌ Can't provision token to GitHub Actions secret in account-a:
  - ❌ Account account-a was denied access to [token #1](#user-content-4bb7e3c2-token-1--account-a-all-repos)
  - ❌ Can't provision secret (no matching rules)

</details>

###### Uses [token #1](#user-content-4bb7e3c2-token-1--account-a-all-repos) <a id="4bb7e3c2-uses-token-1"></a>

### Token issuing <a id="4bb7e3c2-token-issuing"></a>

#### account-a <a id="4bb7e3c2-account-a"></a>

##### Token #1 — account-a (all repos) <a id="4bb7e3c2-token-1--account-a-all-repos"></a>

<details>
<summary>❌ Account account-a was denied access to a token</summary>

- ❌ Admin access to all repos in account-a requested without a role
- ❌ Insufficient access to all repos in account-a based on 1 rule:
  - ❌ Rule #1: "\<description>" gave insufficient access:
    - ❌ contents: have none, wanted admin

</details>

###### Used by <a id="4bb7e3c2-used-by"></a>

- [`SECRET_A`](#user-content-4bb7e3c2-secret_a) (account-x/repo-x)
