## Secret provisioning

### Secret `#1`

- ❌ Secret `SECRET_A` wasn't provisioned for repo `account-x/repo-x`:
- ❌ Failed to provision to GitHub Actions secret in `account-a`: 500 - boom

<details>
<summary>Error details</summary>

```
{
  "message": "boom",
  "documentation_url": "https://docs.example.com/"
}
```

</details>


## Request authorization

### Secret `#1`

- ✅ Repo `account-x/repo-x` was allowed to provision secret `SECRET_A`:
  - ✅ Can use token declaration `account-a/repo-a.token-a`
  - ✅ Can provision token to GitHub Actions secret in `account-a`:
    - ✅ Account `account-a` was allowed access to token `#1`
    - ✅ Can provision secret (no matching rules)

### Token `#1`

- ✅ Account `account-a` was allowed access to a token:
- ✅ Read access to all repos in `account-a` requested without a role
- ✅ Sufficient access to all repos in `account-a` (no matching rules)

[Full logs for this run](https://github.example.com/account-x/repo-x/actions/runs/42)
