> \[!WARNING]
>
> [Provision GitHub Tokens](https://github.com/ghalactic/provision-github-tokens) couldn't parse or validate [this repo's config](https://github.example.com/account-x/repo-x/blob/HEAD/.github/ghalactic/provision-github-tokens.yml).

## Invalid configuration

Your [config](https://github.example.com/account-x/repo-x/blob/HEAD/.github/ghalactic/provision-github-tokens.yml) is not valid:

- `/tokens/token-a` must NOT have additional properties
- `/provision/secrets/SECRET_A/github` must NOT have additional properties
- `/provision/secrets` must have required property 'secrets'
