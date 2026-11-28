### Provisioned 4 secrets

|               | Requester                               | Secret                        | Targets                   |
| :------------ | :-------------------------------------- | :---------------------------- | :------------------------ |
| ⚠️[^fallback] | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_ISSUER_FALLBACK`      | [account-a][gh/account-a] |
| ⚠️[^fallback] | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_PROVISIONER_FALLBACK` | [account-a][gh/account-a] |
| ⚠️[^fallback] | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_BOTH_FALLBACK`        | [account-a][gh/account-a] |
| ✅             | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_NO_FALLBACK`          | [account-a][gh/account-a] |

[gh/account-a]: https://github.example.com/account-a

[gh/account-x/repo-x]: https://github.example.com/account-x/repo-x

[^fallback]: One or more issuers or provisioners failed, and a fallback was used. Re-run with debug logging enabled for details.
