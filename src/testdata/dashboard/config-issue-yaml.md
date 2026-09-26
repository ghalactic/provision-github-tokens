> \[!WARNING]
>
> [Provision GitHub Tokens](https://github.com/ghalactic/provision-github-tokens) couldn't parse or validate [this repo's config](https://github.example.com/account-x/repo-x/blob/HEAD/.github/ghalactic/provision-github-tokens.yml).

## Invalid YAML

Your [config](https://github.example.com/account-x/repo-x/blob/HEAD/.github/ghalactic/provision-github-tokens.yml) contains invalid YAML:

```txt
Flow sequence in block collection must be sufficiently indented and end with a ] at line 2, column 1:

a: [1, 2
b: {c: 1
^
```

```txt
Flow map in block collection must be sufficiently indented and end with a } at line 3, column 1:

b: {c: 1

^
```
