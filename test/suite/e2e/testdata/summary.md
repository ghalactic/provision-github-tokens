### Provisioned 2 of 4 secrets

|    | Requester                                                                                                           | Secret                           | Targets                                                                                                                                                                                        | Reason             |
| :- | :------------------------------------------------------------------------------------------------------------------ | :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| ❌  | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer] | `PARTIALLY_AUTHORIZED_PROVISION` | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer], [ghalactic/provision-github-tokens][gh/ghalactic/provision-github-tokens] | Secret not allowed |
| ❌  | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer] | `UNAUTHORIZED_PROVISION`         | [ghalactic/provision-github-tokens][gh/ghalactic/provision-github-tokens]                                                                                                                      | Secret not allowed |

|    | Requester                                                                                                           | Secret                | Targets                                                                                                             |
| :- | :------------------------------------------------------------------------------------------------------------------ | :-------------------- | :------------------------------------------------------------------------------------------------------------------ |
| ✅  | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer] | `READ_METADATA_TOKEN` | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer] |
| ✅  | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer] | `READ_SECRETS_TOKEN`  | [ghalactic-fixtures/provision-github-tokens-ci-consumer][gh/ghalactic-fixtures/provision-github-tokens-ci-consumer] |

[gh/ghalactic-fixtures/provision-github-tokens-ci-consumer]: https://github.com/ghalactic-fixtures/provision-github-tokens-ci-consumer

[gh/ghalactic/provision-github-tokens]: https://github.com/ghalactic/provision-github-tokens
