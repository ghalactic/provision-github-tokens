### Provisioned 0 of 6 secrets

|    | Requester                               | Secret                     | Targets                                              | Reason                              |
| :- | :-------------------------------------- | :------------------------- | :--------------------------------------------------- | :---------------------------------- |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_TOKEN_NOT_ALLOWED` | [account-a][gh/account-a]                            | Token not allowed                   |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_NO_ISSUER`         | [account-a][gh/account-a]                            | No suitable issuer                  |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_ISSUE_ERROR`       | [account-a][gh/account-a]                            | Failed to issue token               |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_NO_PROVISIONER`    | [account-a][gh/account-a]                            | No suitable provisioner             |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_PARTIAL_FAILURE`   | [account-a][gh/account-a], [account-b][gh/account-b] | Failed to provision to some targets |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_FAILED_PROVISION`  | [account-a][gh/account-a]                            | Failed to provision                 |

[gh/account-a]: https://github.example.com/account-a

[gh/account-b]: https://github.example.com/account-b

[gh/account-x/repo-x]: https://github.example.com/account-x/repo-x
