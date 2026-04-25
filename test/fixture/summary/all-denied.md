## Provisioned 0 of 1 secret

### Failures

#### account-x/repo-x

- ❌ [`SECRET_A`](#pgt-4bb7e3c2-account-xrepo-x--secret_a)

### Secret provisioning

#### account-x/repo-x

##### SECRET\_A <a id="pgt-4bb7e3c2-account-xrepo-x--secret_a"></a>

Uses [token #1](#pgt-4bb7e3c2-token-1)

<details>
<summary>❌ Repo account-x/repo-x wasn't allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ❌ Can't provision token to GitHub Actions secret in account-a:
  - ❌ Account account-a was denied access to [token #1](#pgt-4bb7e3c2-token-1)
  - ❌ Can't provision secret (no matching rules)

</details>

### Token issuing

#### account-a

##### Token #1 — account-a (all repos) <a id="pgt-4bb7e3c2-token-1"></a>

Used by:

- [`SECRET_A`](#pgt-4bb7e3c2-account-xrepo-x--secret_a) (account-x/repo-x)

<details>
<summary>❌ Account account-a was denied access to a token</summary>

- ❌ Admin access to all repos in account-a requested without a role
- ❌ Insufficient access to all repos in account-a based on 1 rule:
  - ❌ Rule #1: "\<description>" gave insufficient access:
    - ❌ contents: have none, wanted admin

</details>
