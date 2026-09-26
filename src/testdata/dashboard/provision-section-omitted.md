> \[!WARNING]
>
> [Provision GitHub Tokens](https://github.com/ghalactic/provision-github-tokens) couldn't provision some of the requested tokens. The following is a summary of [this workflow run](https://github.example.com/actions/runs/123456789/attempts/111).

## Token creation

### Token `#1`

- ❌ **Failed** to create **write** token with access to **all repos** in `account-a`:
  - ❌ No suitable issuer
  - ➖ Wanted **write** access _without_ a role
  - ➖ Wanted access to **all repos** in `account-a`
  - ➖ Wanted **1 permission**:
    - ➖ _contents_: `write`

## Request authorization

### Secret `#1`

- ✅ Repo `account-x/repo-x` **was allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.token-a`
  * ✅ **Can** provision token to **GitHub Actions** secret in `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅  **Can** provision secret (no matching rules)

### Token `#1`

- ✅ Account `account-a` was **allowed** access to a token:
  - ✅ **Write** access to **all repos** in `account-a` requested without a role
  * ✅ **Sufficient** access to **all repos** in `account-a` (no matching rules)
