> \[!WARNING]
>
> [Provision GitHub Tokens] couldn't parse or validate [this repo's config][requester-config].

[provision github tokens]: https://github.com/ghalactic/provision-github-tokens

[requester-config]: https://github.example.com/account-x/repo-x/blob/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/.github/ghalactic/provision-github-tokens.yml

## Invalid configuration

Your [config][requester-config] is not valid:

```txt
ADDTIONAL PROPERTY must NOT have additional properties

  1 | {
> 2 |   "foo": "bar"
    |   ^^^^^ 😲  foo is not expected to be here!
  3 | }
```
