# Provision GitHub Tokens

A [GitHub Action] that creates and rotates [GitHub tokens] declaratively across
your repos.

[github action]: https://docs.github.com/actions
[github tokens]:
  https://docs.github.com/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation#using-an-installation-access-token-to-authenticate-as-an-app-installation

## Glossary

This action uses specific terminology to distinguish roles and concepts. These
terms are used consistently throughout the documentation, configuration files,
and source code.

### Roles

- **Provider** — the repo that runs this action and defines the central
  authorization policy. The provider controls what tokens requesters are allowed
  to have and where secrets can be provisioned. It is the sole authority on
  token policy.
- **Requester** — a repo that declares what tokens it needs and where they
  should be provisioned as secrets. Requesters declare what they _want_; the
  provider decides what they're _allowed_. A requester cannot self-authorize.
- **Consumer** — the repo or account that actually receives an issued token. The
  consumer may be the requester itself, or a different repo that the requester
  has nominated as a provisioning target.
- **Issuer** — a [GitHub App] installation designated to create installation
  access tokens on behalf of requesters. The issuer's own permissions act as a
  hard boundary on what tokens it can create, analogous to an [AWS IAM
  permissions boundary].
- **Provisioner** — a [GitHub App] installation designated to write secrets to
  target repos and organizations. A single app can serve as both issuer and
  provisioner, or the two can be split across separate apps to keep the issuer's
  permissions boundary minimal.

[github app]:
  https://docs.github.com/apps/creating-github-apps/about-creating-github-apps
[aws iam permissions boundary]:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html

### Configuration

- **Provider config** — the YAML config file that lives in the provider repo. It
  defines permission rules (what tokens are allowed) and provision rules (where
  secrets can go). The provider config is the sole policy authority.
- **Requester config** — the YAML config file that lives in each requesting
  repo. It declares what tokens the repo needs and where to provision them as
  secrets. Requester config expresses _desire_; provider config expresses
  _permission_.
- **Token declaration** — a named, reusable definition in a requester config
  that specifies an account, a set of repos, and the permissions needed. Token
  declarations can be _shared_ (any requester can reference them) or _private_
  (only the declaring repo can use them).
- **Token reference** — a string that points to a token declaration. The
  qualified form is `{owner/repo}.{name}`, which can refer to any shared
  declaration. The short form is just `{name}`, which refers to a declaration in
  the same requester config.

### Authorization

- **Permission rule** — a rule in the provider config that controls what tokens
  consumers can request. Each rule matches on consumers (by pattern), target
  resources (all repos, specific repos, or no repos), and permission levels.
  When multiple rules match, later rules override earlier ones (last-rule-wins).
- **Provision rule** — a rule in the provider config that controls where secrets
  can be provisioned. Each rule matches on requesters, secret names, and
  provision targets. Uses deny-wins semantics — any matching deny vetoes the
  result, regardless of other matching allows.
- **Token authorization** — the check that determines whether a requester can
  obtain a token with specific permissions for specific repos. Both the
  provider's permission rules and the issuer's permissions boundary must allow
  the request.
- **Provision authorization** — the check that determines whether a requester
  can place a secret of a given type at a given target. Independent of token
  authorization — both checks must pass for a secret to be provisioned.
- **Permissions boundary** — the hard ceiling on token permissions imposed by
  the issuer installation's own granted permissions. Even if provider rules
  allow a request, the issuer cannot grant permissions it doesn't have.
  Analogous to an [AWS IAM permissions boundary].
- **Access level** — the level of access granted by a token for a specific
  permission, ranked as: `none` < `read` < `write` < `admin`.

### Provisioning

- **Token creation result** — the outcome of attempting to create an
  installation access token after authorization. A token may be successfully
  created, or the attempt may fail because it was not authorized, no issuer was
  found, or an error occurred.
- **Provisioning result** — the outcome of attempting to write a secret to a
  provision target. A secret may be successfully provisioned, or the attempt may
  fail because it was not authorized, no token was available, no provisioner was
  found, or an error occurred.
- **Provision target** — the combination of a secret type and a destination
  account, repo, or environment where a secret is placed.
- **Secret type** — the kind of GitHub secret location within a provision
  target: `actions`, `codespaces`, `dependabot`, or `environment`. Determines
  which GitHub API is used to write the secret.
