## Provisioned 0 of 1 secret <a id="4bb7e3c2-provisioned-0-of-1-secret"></a>

### Failures <a id="4bb7e3c2-failures"></a>

#### [account-x/repo-x](https://github.example.com/account-x/repo-x) <a id="4bb7e3c2-account-xrepo-x"></a>

- ❌ [`SECRET_A`](#user-content-4bb7e3c2-secret_a)

### Secrets <a id="4bb7e3c2-secrets"></a>

#### Requested by [account-x/repo-x](https://github.example.com/account-x/repo-x) <a id="4bb7e3c2-requested-by-account-xrepo-x"></a>

##### `SECRET_A` <a id="4bb7e3c2-secret_a"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result"></a>

<details>
<summary>❌ Repo <a href="https://github.example.com/account-x/repo-x">account-x/repo-x</a> wasn't allowed to provision secret <code>SECRET_A</code></summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ❌ Can't provision token to GitHub Actions secret in [account-a](https://github.example.com/account-a):
  - ❌ Account [account-a](https://github.example.com/account-a) was denied access to [token #1](#user-content-4bb7e3c2-token-1---account-a-all-repos)
  - ❌ Can't provision secret (no matching rules)

</details>

###### Uses <a id="4bb7e3c2-uses"></a>

- [Token #1](#user-content-4bb7e3c2-token-1---account-a-all-repos)

### Tokens <a id="4bb7e3c2-tokens"></a>

#### Consumed by [account-a](https://github.example.com/account-a) <a id="4bb7e3c2-consumed-by-account-a"></a>

##### Token #1 - [account-a](https://github.example.com/account-a) (all repos) <a id="4bb7e3c2-token-1---account-a-all-repos"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result-1"></a>

<details>
<summary>❌ Account <a href="https://github.example.com/account-a">account-a</a> was denied access to a token</summary>

- ❌ Admin access to all repos in [account-a](https://github.example.com/account-a) requested without a role
- ❌ Insufficient access to all repos in [account-a](https://github.example.com/account-a) based on 1 rule:
  - ❌ Rule #1: "\<description>" gave insufficient access:
    - ❌ contents: have none, wanted admin

</details>

###### Used by <a id="4bb7e3c2-used-by"></a>

- [`SECRET_A`](#user-content-4bb7e3c2-secret_a) ([account-x/repo-x](https://github.example.com/account-x/repo-x))
