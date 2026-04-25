## Provisioned 1 of 2 secrets <a id="4bb7e3c2-provisioned-1-of-2-secrets"></a>

### Failures <a id="4bb7e3c2-failures"></a>

#### [account-x/repo-x](https://github.example.com/account-x/repo-x) <a id="4bb7e3c2-account-xrepo-x"></a>

- ❌ [`SECRET_SELECTED`](#user-content-4bb7e3c2-secret_selected)

### Secrets <a id="4bb7e3c2-secrets"></a>

#### Requested by [account-x/repo-x](https://github.example.com/account-x/repo-x) <a id="4bb7e3c2-requested-by-account-xrepo-x"></a>

##### `SECRET_NO_REPOS` <a id="4bb7e3c2-secret_no_repos"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result"></a>

<details>
<summary>✅ Repo <a href="https://github.example.com/account-x/repo-x">account-x/repo-x</a> was allowed to provision secret <code>SECRET_NO_REPOS</code></summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ✅ Can provision token to GitHub Actions secret in [account-a](https://github.example.com/account-a):
  - ✅ Account [account-a](https://github.example.com/account-a) was allowed access to [token #1](#user-content-4bb7e3c2-token-1---account-a-no-repos)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

###### Uses <a id="4bb7e3c2-uses"></a>

- [Token #1](#user-content-4bb7e3c2-token-1---account-a-no-repos)

##### `SECRET_SELECTED` <a id="4bb7e3c2-secret_selected"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result-1"></a>

<details>
<summary>❌ Repo <a href="https://github.example.com/account-x/repo-x">account-x/repo-x</a> wasn't allowed to provision secret <code>SECRET_SELECTED</code></summary>

- ✅ Can use token declaration account-a/repo-a.tokenA
- ❌ Can't provision token to GitHub Actions secret in [account-a](https://github.example.com/account-a):
  - ❌ Account [account-a](https://github.example.com/account-a) was denied access to [token #2](#user-content-4bb7e3c2-token-2---account-a-3-repos)
  - ✅ Can provision secret based on 1 rule:
    - ✅ Allowed by rule #1

</details>

###### Uses <a id="4bb7e3c2-uses-1"></a>

- [Token #2](#user-content-4bb7e3c2-token-2---account-a-3-repos)

### Tokens <a id="4bb7e3c2-tokens"></a>

#### Consumed by [account-a](https://github.example.com/account-a) <a id="4bb7e3c2-consumed-by-account-a"></a>

##### Token #1 - [account-a](https://github.example.com/account-a) (no repos) <a id="4bb7e3c2-token-1---account-a-no-repos"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result-2"></a>

<details>
<summary>✅ Account <a href="https://github.example.com/account-a">account-a</a> was allowed access to a token</summary>

- ✅ Read access to [account-a](https://github.example.com/account-a) requested without a role
- ✅ Sufficient access to [account-a](https://github.example.com/account-a) based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ members: have read, wanted read

</details>

###### Used by <a id="4bb7e3c2-used-by"></a>

- [`SECRET_NO_REPOS`](#user-content-4bb7e3c2-secret_no_repos) ([account-x/repo-x](https://github.example.com/account-x/repo-x))

##### Token #2 - [account-a](https://github.example.com/account-a) (3 repos) <a id="4bb7e3c2-token-2---account-a-3-repos"></a>

###### Authorization result <a id="4bb7e3c2-authorization-result-3"></a>

<details>
<summary>❌ Account <a href="https://github.example.com/account-a">account-a</a> was denied access to a token</summary>

- ❌ Write access to repos in [account-a](https://github.example.com/account-a) requested without a role
- ✅ 1 repo pattern matched 3 repos
- ✅ Sufficient access to repo [account-a/repo-a](https://github.example.com/account-a/repo-a) based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ contents: have write, wanted write
- ✅ Sufficient access to repo [account-a/repo-b](https://github.example.com/account-a/repo-b) based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ contents: have write, wanted write
- ✅ Sufficient access to repo [account-a/repo-c](https://github.example.com/account-a/repo-c) based on 1 rule:
  - ✅ Rule #1: "\<description>" gave sufficient access:
    - ✅ contents: have write, wanted write

</details>

###### Used by <a id="4bb7e3c2-used-by-1"></a>

- [`SECRET_SELECTED`](#user-content-4bb7e3c2-secret_selected) ([account-x/repo-x](https://github.example.com/account-x/repo-x))
