# Provision GitHub Tokens

A [GitHub Action] that creates and rotates [GitHub tokens] declaratively across
your repos.

[github action]: https://docs.github.com/actions
[github tokens]:
  https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#using-an-installation-access-token-to-authenticate-as-an-app-installation

## Glossary

### General

<dl>
  <dt>Account</dt>
  <dd>a GitHub org or user.</dd>
</dl>

### Roles

<dl>
  <dt>Provider</dt>
  <dd>
    the repo that runs this action and defines the central authorization policy.
  </dd>
  <dt>Requester</dt>
  <dd>
    a repo that declares what tokens it needs and where to provision them as
    secrets.
  </dd>
  <dt>Consumer</dt>
  <dd>the repo or account that actually receives an issued token.</dd>
  <dt>Issuer</dt>
  <dd>
    a GitHub App installation designated to create installation access tokens on
    behalf of requesters.
  </dd>
  <dt>Provisioner</dt>
  <dd>
    a GitHub App installation designated to create secrets in target accounts
    and repos.
  </dd>
</dl>

### Configuration

> [!TIP]
>
> Don't confuse the term _declaration_ with _definition_. This project uses
> _declarative_ configuration. If you see the term "definition", it's probably a
> typo.

<dl>
  <dt>Provider config</dt>
  <dd>
    the YAML config file that lives in the provider repo that defines permission
    rules and provision rules.
  </dd>
  <dt>Requester config</dt>
  <dd>
    the YAML config file that lives in each requesting repo that declares what
    tokens the repo needs and where to provision them.
  </dd>
  <dt>Token declaration</dt>
  <dd>
    a reusable declaration in a requester config that specifies an account, a
    set of repos, and the permissions needed.
  </dd>
  <dt>Token reference</dt>
  <dd>a string identifier that points to a token declaration.</dd>
  <dt>Secret declaration</dt>
  <dd>
    a declaration in a requester config that pairs a token reference with a set
    of provision targets.
  </dd>
</dl>

### Authorization

<dl>
  <dt>Permission rule</dt>
  <dd>
    a rule in the provider config that controls what tokens consumers can
    request.
  </dd>
  <dt>Provision rule</dt>
  <dd>
    a rule in the provider config that controls where requesters can provision
    secrets.
  </dd>
  <dt>Token authorization</dt>
  <dd>
    the check that determines whether a requester can obtain a token with
    specific permissions for specific repos.
  </dd>
  <dt>Provision authorization</dt>
  <dd>
    the check that determines whether a requester can place a secret of a given
    type at a given target.
  </dd>
  <dt>Permissions boundary</dt>
  <dd>
    the hard ceiling on token permissions imposed by the issuer installation's
    own granted permissions.
  </dd>
  <dt>Access level</dt>
  <dd>
    the level of access granted by a token for a specific permission, ranked as:
    <code>none</code> &lt; <code>read</code> &lt; <code>write</code> &lt;
    <code>admin</code>.
  </dd>
</dl>

### Provisioning

<dl>
  <dt>Token creation result</dt>
  <dd>
    the outcome of attempting to create an installation access token after
    authorization.
  </dd>
  <dt>Provisioning result</dt>
  <dd>
    the outcome of attempting to create a secret in a provision target.
  </dd>
  <dt>Provision target</dt>
  <dd>
    the combination of a secret type and a destination account, repo, or
    environment where the action places a secret.
  </dd>
  <dt>Secret type</dt>
  <dd>
    the kind of GitHub secret location within a provision target:
    <code>actions</code>, <code>codespaces</code>,
    <code>dependabot</code>, or <code>environment</code>.
  </dd>
</dl>
