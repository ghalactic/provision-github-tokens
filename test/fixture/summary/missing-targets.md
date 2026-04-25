## Provisioned 1 of 2 secrets <a id="4bb7e3c2-provisioned-1-of-2-secrets"></a>

### Failures <a id="4bb7e3c2-failures"></a>

#### [account-x/repo-x](https://github.example.com/account-x/repo-x) <a id="4bb7e3c2-account-xrepo-x"></a>

- ❌ [`SECRET_B`](#user-content-4bb7e3c2-secret_b)

### Secrets <a id="4bb7e3c2-secrets"></a>

#### [account-x/repo-x](https://github.example.com/account-x/repo-x) <a id="4bb7e3c2-account-xrepo-x-1"></a>

##### SECRET\_A <a id="4bb7e3c2-secret_a"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result"></a>

<details>
<summary>✅ Repo <a href="https://github.example.com/account-x/repo-x">account-x/repo-x</a> was allowed to provision secret SECRET_A</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in [account-a](https://github.example.com/account-a):
  - ✅ Account [account-a](https://github.example.com/account-a) was allowed access to [token #1](#user-content-4bb7e3c2-token-1---account-a-all-repos)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

###### Uses <a id="4bb7e3c2-uses"></a>

- [Token #1](#user-content-4bb7e3c2-token-1---account-a-all-repos)

##### SECRET\_B <a id="4bb7e3c2-secret_b"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result-1"></a>

<details>
<summary>❌ Repo <a href="https://github.example.com/account-x/repo-x">account-x/repo-x</a> wasn't allowed to provision secret SECRET_B</summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ❌ No targets specified

</details>

### Tokens <a id="4bb7e3c2-tokens"></a>

#### [account-a](https://github.example.com/account-a) <a id="4bb7e3c2-account-a"></a>

##### Token #1 - [account-a](https://github.example.com/account-a) (all repos) <a id="4bb7e3c2-token-1---account-a-all-repos"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result-2"></a>

<details>
<summary>✅ Account <a href="https://github.example.com/account-a">account-a</a> was allowed access to a token</summary>

- ✅ Read access to all repos in [account-a](https://github.example.com/account-a) requested without a role
- ✅ Sufficient access to all repos in [account-a](https://github.example.com/account-a) based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ metadata: have read, wanted read

</details>

###### Used by <a id="4bb7e3c2-used-by"></a>

- [`SECRET_A`](#user-content-4bb7e3c2-secret_a) ([account-x/repo-x](https://github.example.com/account-x/repo-x))
