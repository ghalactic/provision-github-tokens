## Provisioned 1 of 2 secrets

|    | Requester                                                       | Secret     | Targets |
| :- | :-------------------------------------------------------------- | :--------- | :------ |
| ❌  | [account-x/repo-x](https://github.example.com/account-x/repo-x) | `SECRET_B` |         |

|    | Requester                                                       | Secret     | Targets                                           |
| :- | :-------------------------------------------------------------- | :--------- | :------------------------------------------------ |
| ✅  | [account-x/repo-x](https://github.example.com/account-x/repo-x) | `SECRET_A` | [account-a](https://github.example.com/account-a) |
