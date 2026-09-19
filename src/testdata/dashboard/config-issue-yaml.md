> \[!WARNING]
>
> [Provision GitHub Tokens] couldn't parse or validate [this repo's config][requester-config].

[provision github tokens]: https://github.com/ghalactic/provision-github-tokens

[requester-config]: https://github.example.com/account-x/repo-x/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/.github/ghalactic/provision-github-tokens.yml

## Invalid YAML

Your [config][requester-config] contains invalid YAML:

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
