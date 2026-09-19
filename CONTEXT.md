# Provision GitHub Tokens

This is a GitHub Action that declaratively provisions GitHub tokens as
repository and organization secrets. Requesters declare the tokens they want,
and the provider authorizes issuance and provisioning.

## Language

### Parties

**App**: A GitHub App registered in the `apps` input and designated as an
issuer, a provisioner, or both.

**Consumer**: The repo or account that receives an issued token. A requester can
consume its own tokens or nominate other consumers.

**Installation**: A GitHub App's per-account installation, carrying its own
permissions and reachable repos. Provisioner installations are the discovery
boundary; issuer installations set the permission boundary.

**Issuer**: An app installation responsible for creating access tokens.

**Provider**: The repo that runs this action. Its provider config sets the
authorization policy; requesters express what they want, the provider decides
what is allowed.

**Provisioner**: An app installation responsible for creating secrets in target
accounts and repos.

**Requester**: A repo that declares the tokens it wants and where to provision
them as secrets. _Avoid_: consumer

**Role**: A named identity an issuer app can act under. A token declaration can
name a role (`as`) to select which issuers are eligible; write-level-or-higher
requests must name one.

### Configuration

**Provider config**: The YAML file in the provider repo that sets permission
rules and provision rules.

**Private token declaration**: A token declaration referenceable only within the
repo that declares it.

**Requester config**: The YAML file in a requesting repo that declares the
tokens it wants issued and where to provision them.

**Secret declaration**: An entry in a requester config linking a token reference
to the provision targets that should receive the token as a secret.

**Shared token declaration**: A token declaration referenceable from any repo.
References can be written `<owner>/<repo>.<name>` or, within the same account,
`./<repo>.<name>`.

**Token declaration**: An entry in a requester config naming an account, repos,
permissions, and an optional role. _Avoid_: definition

**Token reference**: An ID pointing at a token declaration, written
`<owner>/<repo>.<name>`, or as a shorthand: `./<repo>.<name>` for a declaration
in the same account, or a bare `<name>` for a declaration in the same repo.

### Authorization

**Access level**: The ranked value of a permission, from lowest to highest:
`none`, `read`, `write`, `admin`.

**Empty permissions**: A token declaration with no meaningful permission set,
rejected before authorization because GitHub treats missing permissions as "all
permissions".

**Permission rule**: A provider-config rule controlling which tokens requesters
may obtain for which consumers, matched by consumer and repository scope.

**Permissions boundary**: The cap on a token's permissions set by the issuer
installation's own grants, independent of provider rules.

**Provision authorization**: The check deciding whether a requester can
provision a secret to a given target.

**Provision rule**: A provider-config rule controlling where requesters can
provision secrets.

**Repository scope**: The scope of a token request, one of three categories: all
repos (a single permission set covering current and future repos), selected
repos (every repo must be individually authorized), or no repos (account-level
capabilities only).

**Token authorization**: The check deciding whether a consumer should have
access to a token with given permissions for given repos.

### Resolution

**Deny-by-default**: The rule that a provision target no rule explicitly allows
is denied.

**Deny-wins**: The rule that, within a single provision rule, a deny from any
matching pattern vetoes the result for that target.

**Last-rule-wins**: The rule that, when multiple rules match, the last rule in
the config decides.

**Min-wins**: The rule that overlapping permission patterns in a single rule
resolve to the lowest matching access level, so patterns fail closed. Literal
permission names still override the pattern result. _Avoid_: max-wins

**Self-targeting**: Provisioning a secret to the requesting repo's own repo or
account, which can override a pattern result.

### Provisioning

**Authorization explanation**: The human-readable basis for each token and
provision authorization decision, doubling as an audit trail.

**Provision target**: A secret type plus the account, repo, or environment where
a secret is provisioned.

**Provisioning result**: The result of trying to create a secret in a provision
target.

**Secret type**: The kind of secret a provision target holds: `actions`,
`codespaces`, `dependabot`, or `environment`.

**Token creation result**: The result of trying to create an access token after
authorization passes.

**Token dashboard**: The single persistent issue in a requester repo listing
that repo's current provisioning failures, authorization denials, or config
issues. At most one is open at a time; each run refreshes it, and it is closed
when nothing is failing or when dashboards are disabled. It is never reopened —
a fresh dashboard is opened instead. _Avoid_: failure dashboard

### References and patterns

**Account reference**: A reference written `<account>` naming a GitHub org or
user.

**Environment reference**: A reference written `<account>/<repo>/<environment>`
naming a deployment environment.

**GitHub pattern**: A pattern composed of an account name pattern and,
optionally, a repository name pattern, matched against `<account>` or
`<account>/<repo>`. The `./repo` and `.` forms are normalized to the defining
repo.

**Name pattern**: A glob with `*` matching any single path segment, used for
permission names, accounts, repos, secret names, and environments.

**Repo reference**: A reference written `<account>/<repo>` naming a repository.
