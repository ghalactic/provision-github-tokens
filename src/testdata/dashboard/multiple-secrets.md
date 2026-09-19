> \[!WARNING]
>
> [Provision GitHub Tokens](https://github.com/ghalactic/provision-github-tokens) couldn't provision some of the requested tokens. The following is a summary of [this workflow run](https://github.example.com/actions/runs/123456789/attempts/111).

## Secret provisioning

### Secret `#1`

- ✅ Secret `SECRET_A` **was** provisioned for repo `account-x/repo-x`:
  - ✅ **Provisioned** to **GitHub Actions** secret in `account-a`

### Secret `#2`

- ❌ Secret `SECRET_B` was **partially** provisioned for repo `account-x/repo-x`:
  - ✅ **Provisioned** to **GitHub Actions** secret in `account-a`
  - ❌ **Failed** to provision to **GitHub Actions** secret in `account-b`:
    - ❌ **500** - _boom_
      <details>
      <summary>Response body</summary>

      ```json
      {
        "message": "boom",
        "documentation_url": "https://docs.example.com/"
      }
      ```

      </details>

## Token creation

### Token `#1`

- ✅ **Read-only** token created with access to **all repos** in `account-a`:
  - ✅ Has **read** access _without_ a role
  - ✅ Has access to **all repos** in `account-a`
  - ✅ Has **1 permission**:
    - ✅ _contents_: `read`

## Request authorization

### Secret `#1`

- ✅ Repo `account-x/repo-x` **was allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-a/repo-a.token-a`
  * ✅ **Can** provision token to **GitHub Actions** secret in `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅  **Can** provision secret (no matching rules)

### Secret `#2`

- ✅ Repo `account-x/repo-x` **was allowed** to provision secret `SECRET_B`:
  - ✅ **Can** use token declaration `account-a/repo-a.token-b`
  * ✅ **Can** provision token to **GitHub Actions** secret in `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅  **Can** provision secret (no matching rules)
  * ✅ **Can** provision token to **GitHub Actions** secret in `account-b`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅  **Can** provision secret (no matching rules)

### Token `#1`

- ✅ Account `account-a` was **allowed** access to a token:
  - ✅ **Read** access to **all repos** in `account-a` requested without a role
  * ✅ **Sufficient** access to **all repos** in `account-a` (no matching rules)
