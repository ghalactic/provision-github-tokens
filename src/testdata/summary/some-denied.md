### Provisioned 1 of 2 secrets

|    | Requester                               | Secret     | Targets                   | Reason             |
| :- | :-------------------------------------- | :--------- | :------------------------ | :----------------- |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_B` | [account-a][gh/account-a] | Secret not allowed |

|    | Requester                               | Secret     | Targets                   |
| :- | :-------------------------------------- | :--------- | :------------------------ |
| ✅  | [account-x/repo-x][gh/account-x/repo-x] | `SECRET_A` | [account-a][gh/account-a] |

[gh/account-a]: https://github.example.com/account-a

[gh/account-x/repo-x]: https://github.example.com/account-x/repo-x
