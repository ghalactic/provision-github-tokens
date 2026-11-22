> \[!WARNING]
>
> [Provision GitHub Tokens] couldn't provision some of the requested tokens. The following is a summary of [this workflow run][workflow-run].

[provision github tokens]: https://github.com/ghalactic/provision-github-tokens

[workflow-run]: https://github.example.com/actions/runs/123456789/attempts/111

## Secret provisioning

### Secret `#1`

- ❌ Secret `SECRET_A` **wasn't** provisioned for repo `account-b/repo-b`:
  - ❌ **Not allowed** to provision to **GitHub Actions** secret in `account-a`
    - ❌ Would've been readable by **2 repos**:
      - ❌ `repo-a`
      - ❌ `repo-b`

## Request authorization

### Secret `#1`

- ❌ Repo `account-b/repo-b` **wasn't allowed** to provision secret `SECRET_A`:
  - ✅ **Can** use token declaration `account-b/repo-b.token`
  * ❌ **Can't** provision token to **GitHub Actions** secret in account `account-a`:
    - ✅ Account `account-a` was **allowed** access to token `#1`
    - ✅ **Can** provision to **selected repos** based on 1 rule:
      - ✅ **Allowed** by rule `#1`
    - ✅ **Can** provision secret to **private** repo `account-a/repo-a`:
      - ✅ **Allowed** by rule `#1`
    - ✅ **Can** provision secret to **private** repo `account-a/repo-b`:
      - ✅ **Allowed** by rule `#1`
    - ❌ **Conflicting declarations** were found:
      - ❌ Declared by `account-c/repo-c` as secret `SECRET_A` using token declaration `account-c/repo-c.token`

### Token `#1`

- ✅ Account `account-a` was **allowed** access to a token:
  - ✅ **Read** access to **all repos** in `account-a` requested without a role
  * ✅ **Sufficient** access to **all repos** in `account-a` based on 1 rule:
    - ✅ Rule `#1` gave sufficient access:
      - ✅ _metadata_: have `read`, wanted `read`
