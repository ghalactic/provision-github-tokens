# Provision GitHub Tokens

A [GitHub Action] that creates and rotates [GitHub tokens] that you declare
across your repositories.

[github action]: https://docs.github.com/actions
[github tokens]:
  https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#using-an-installation-access-token-to-authenticate-as-an-app-installation

## Glossary

### General

<dl>
  <dt>Account</dt>
  <dd>A GitHub org or user.</dd>
</dl>

### Roles

<dl>
  <dt>Provider</dt>
  <dd>
    The repo that runs this action. It sets the auth policy.
  </dd>

  <dt>Requester</dt>
  <dd>
    A repo that declares what tokens it needs and where to provision them as
    secrets.
  </dd>

  <dt>Consumer</dt>
  <dd>The repo or account that receives an issued token.</dd>

  <dt>Issuer</dt>
  <dd>
    A GitHub App installation that creates access tokens for requesters.
  </dd>

  <dt>Provisioner</dt>
  <dd>
    A GitHub App installation that creates secrets in target accounts and
    repositories.
  </dd>
</dl>

### Configuration

> [!TIP]
>
> Don't confuse _declaration_ with _definition_. This project uses _declarative_
> config. If you see "definition", it's likely a typo.

<dl>
  <dt>Provider config</dt>
  <dd>
    A YAML file in the provider repo. It sets permission rules and
    provision rules.
  </dd>

  <dt>Requester config</dt>
  <dd>
    A YAML file in a requesting repo. It declares what tokens that repo
    needs and where to provision them.
  </dd>

  <dt>Token declaration</dt>
  <dd>
    An entry in a requester config that names an account, repositories, and
    permissions.
  </dd>

  <dt>Token reference</dt>
  <dd>An ID that points to a token declaration.</dd>

  <dt>Secret declaration</dt>
  <dd>
    An entry in a requester config that links a token reference to provision
    targets.
  </dd>
</dl>

### Authorization

<dl>
  <dt>Permission rule</dt>
  <dd>
    A rule in the provider config. It controls what tokens consumers can
    request.
  </dd>

  <dt>Provision rule</dt>
  <dd>
    A rule in the provider config. It controls where requesters can provision
    secrets.
  </dd>

  <dt>Token authorization</dt>
  <dd>
    The check that decides if a requester can get a token with certain
    permissions and repositories.
  </dd>

  <dt>Provision authorization</dt>
  <dd>
    The check that decides if a requester can place a secret at a given
    target.
  </dd>

  <dt>Permissions boundary</dt>
  <dd>
    The cap on token permissions. Set by the issuer installation's own grants.
  </dd>

  <dt>Access level</dt>
  <dd>
    The access a token grants for a given permission, ranked as:
    <code>none</code> &lt; <code>read</code> &lt; <code>write</code> &lt;
    <code>admin</code>.
  </dd>
</dl>

<!-- vale Ghalactic.HeadingGerund = NO -->

### Provisioning

<!-- vale Ghalactic.HeadingGerund = YES -->

<dl>
  <dt>Token creation result</dt>
  <dd>
    The result of trying to create an access token after auth checks pass.
  </dd>

  <dt>Provisioning result</dt>
  <dd>
    The result of trying to create a secret in a provision target.
  </dd>

  <dt>Provision target</dt>
  <dd>
    A secret type plus the account, repo, or environment where the action
    places that secret.
  </dd>

  <dt>Secret type</dt>
  <dd>
    The kind of GitHub secret within a provision target:
    <code>actions</code>, <code>codespaces</code>,
    <code>dependabot</code>, or <code>environment</code>.
  </dd>
</dl>
