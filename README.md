# Provision GitHub Tokens

A [GitHub Action] that creates and rotates [GitHub tokens] declaratively across
your repos.

[github action]: https://docs.github.com/actions
[github tokens]:
  https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#using-an-installation-access-token-to-authenticate-as-an-app-installation

## Glossary

### General

- **Account**: a GitHub org or user.

### Roles

- **Provider**: the repo that runs this action and defines the central
  authorization policy.
- **Requester**: a repo that declares what tokens it needs and where to
  provision them as secrets.
- **Consumer**: the repo or account that actually receives an issued token.
- **Issuer**: a GitHub App installation designated to create installation access
  tokens on behalf of requesters.
- **Provisioner**: a GitHub App installation designated to create secrets in
  target accounts and repos.

### Configuration

> [!TIP]
>
> Don't confuse the term _declaration_ with _definition_. This project uses
> _declarative_ configuration. If you see the term "definition", it's probably a
> typo.

- **Provider config**: the YAML config file that lives in the provider repo that
  defines permission rules and provision rules.
- **Requester config**: the YAML config file that lives in each requesting repo
  that declares what tokens the repo needs and where to provision them.
- **Token declaration**: a reusable declaration in a requester config that
  specifies an account, a set of repos, and the permissions needed.
- **Token reference**: a string identifier that points to a token declaration.
- **Secret declaration**: a declaration in a requester config that pairs a token
  reference with a set of provision targets.

### Authorization

- **Permission rule**: a rule in the provider config that controls what tokens
  consumers can request.
- **Provision rule**: a rule in the provider config that controls where
  requesters can provision secrets.
- **Token authorization**: the check that determines whether a requester can
  obtain a token with specific permissions for specific repos.
- **Provision authorization**: the check that determines whether a requester can
  place a secret of a given type at a given target.
- **Permissions boundary**: the hard ceiling on token permissions imposed by the
  issuer installation's own granted permissions.
- **Access level**: the level of access granted by a token for a specific
  permission, ranked as: `none` < `read` < `write` < `admin`.

### Provisioning

- **Token creation result**: the outcome of attempting to create an installation
  access token after authorization.
- **Provisioning result**: the outcome of attempting to create a secret in a
  provision target.
- **Provision target**: the combination of a secret type and a destination
  account, repo, or environment where the action places a secret.
- **Secret type**: the kind of GitHub secret location within a provision target:
  `actions`, `codespaces`, `dependabot`, or `environment`.
