### Config issues

> \[!WARNING]
>
> 3 requester configs couldn't be parsed or validated.

|    | Requester                               | Reason                                              |
| :- | :-------------------------------------- | :-------------------------------------------------- |
| ❌  | [account-x/repo-x][gh/account-x/repo-x] | [Invalid configuration][gh/account-x/repo-x/config] |
| ❌  | [account-y/repo-y][gh/account-y/repo-y] | [Invalid YAML][gh/account-y/repo-y/config]          |
| ❌  | [account-z/repo-z][gh/account-z/repo-z] | [Unexpected error][gh/account-z/repo-z/config]      |

### Provisioned 1 secret

|    | Requester                               | Secret     | Targets                   |
| :- | :-------------------------------------- | :--------- | :------------------------ |
| ✅  | [account-w/repo-w][gh/account-w/repo-w] | `SECRET_A` | [account-a][gh/account-a] |

[gh/account-a]: https://github.example.com/account-a

[gh/account-w/repo-w]: https://github.example.com/account-w/repo-w

[gh/account-x/repo-x]: https://github.example.com/account-x/repo-x

[gh/account-x/repo-x/config]: https://github.example.com/account-x/repo-x/blob/1111111111111111111111111111111111111111/.github/ghalactic/provision-github-tokens.yml

[gh/account-y/repo-y]: https://github.example.com/account-y/repo-y

[gh/account-y/repo-y/config]: https://github.example.com/account-y/repo-y/blob/2222222222222222222222222222222222222222/.github/ghalactic/provision-github-tokens.yml

[gh/account-z/repo-z]: https://github.example.com/account-z/repo-z

[gh/account-z/repo-z/config]: https://github.example.com/account-z/repo-z/blob/3333333333333333333333333333333333333333/.github/ghalactic/provision-github-tokens.yml
