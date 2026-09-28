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
> 2 |   "foo": "bar",
    |   ^^^^^ 😲  foo is not expected to be here!
  3 |   "tokens": {
  4 |     "token-a": {
  5 |       "repos": "all",

ADDTIONAL PROPERTY must NOT have additional properties

   7 |         "contents": "reed"
   8 |       },
>  9 |       "missing-roles": true
     |       ^^^^^^^^^^^^^^^ 😲  missing-roles is not expected to be here!
  10 |     }
  11 |   },
  12 |   "provision": {

ENUM must be equal to one of the allowed values
(read, write)

   5 |       "repos": "all",
   6 |       "permissions": {
>  7 |         "contents": "reed"
     |                     ^^^^^^ 👈🏽  Did you mean read here?
   8 |       },
   9 |       "missing-roles": true
  10 |     }

ADDTIONAL PROPERTY must NOT have additional properties

  15 |         "token": "token-a",
  16 |         "github": {
> 17 |           "repositories": true
     |           ^^^^^^^^^^^^^^ 😲  repositories is not expected to be here!
  18 |         }
  19 |       }
  20 |     }
```
