> \[!WARNING]
>
> [Provision GitHub Tokens] couldn't parse or validate [this repo's config][requester-config].

[provision github tokens]: https://github.com/ghalactic/provision-github-tokens

[requester-config]: https://github.example.com/account-x/repo-x/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/.github/ghalactic/provision-github-tokens.yml

## Invalid configuration

Your [config][requester-config] is not valid:

- `/` must NOT have additional properties (`foo`)
- `/tokens/token-a` must NOT have additional properties (`missing-roles`)
- `/provision/secrets/SECRET_A/github` must NOT have additional properties (`repositories`)
- `/provision/secrets` must have required property 'secrets'
