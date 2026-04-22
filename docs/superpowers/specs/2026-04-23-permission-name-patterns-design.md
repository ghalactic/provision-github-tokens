# Permission name patterns in permissions rules

> Design spec for [#39] — Support permission name patterns in permissions rules.

[#39]: https://github.com/ghalactic/provision-github-tokens/issues/39

## Problem

Provider permission rules currently require explicit permission names as keys in
the `permissions` field (e.g., `contents: read`, `issues: write`). To grant
broad access, a provider must enumerate every permission individually. This is
verbose and fragile — new GitHub permissions require updating every affected
rule.

## Proposed approach

Allow glob-style patterns (using `*`) as keys in the `permissions` field of
provider permission rules. Patterns are matched against the _requested_
permissions (not a static list of all known GitHub permissions), so the system
never requires a hard-coded permission list.

A two-tier resolution determines the effective access level within a single
rule:

1. **Pattern keys** (containing `*`) set a broad baseline via max-wins
   semantics.
2. **Literal keys** (no `*`) unconditionally override whatever patterns
   computed.

Between rules, existing behavior is preserved: later rules override earlier
rules for the same permission.

## Design

### Pattern interface extension

The `Pattern` interface gains a `readonly isLiteral` property:

```ts
export type Pattern = {
  test: (string: string) => boolean;
  toString: () => string;
  readonly isLiteral: boolean;
};
```

- `NamePattern`: `isLiteral` is `true` when the pattern string contains no `*`.
- `GitHubPattern`: `isLiteral` is `true` when both the account part and repo
  part (if any) are literals.

This is backward-compatible. All existing pattern creation sites produce
patterns that can correctly report this property.

### Two-tier permission resolution

The token authorizer's permission handling changes as follows.

**At rule initialization** (`patternsForRule`): For each rule, pre-compile the
permission keys into `NamePattern` objects. Partition them into literals and
patterns based on `isLiteral`.

**At authorization time** (new `resolvePermissions` function): For each
requested permission name:

1. Find all matching _pattern_ keys (where `pattern.test(permissionName)` is
   `true`), take the **max** access level among them.
2. If there's a matching _literal_ key, use that access level instead
   (unconditional override).
3. If neither matches, this rule does not affect this permission.

The resolved concrete `Permissions` object is then applied to the accumulated
`have` via `Object.assign`, exactly as before. Inter-rule semantics ("later rule
overrides") remain unchanged.

### Walkthrough

Given a rule:

```yaml
permissions:
  "*": read
  "secret_*": write
  contents: write
  issues: none
```

And a request for
`{contents: write, issues: read, secrets: write, secret_scanning_alerts: read}`:

| Permission               | Matching patterns (max)                     | Literal override   | Final     |
| ------------------------ | ------------------------------------------- | ------------------ | --------- |
| `contents`               | `*` → read                                  | `contents` → write | **write** |
| `issues`                 | `*` → read                                  | `issues` → none    | **none**  |
| `secrets`                | `*` → read                                  | —                  | **read**  |
| `secret_scanning_alerts` | `*` → read, `secret_*` → write → max: write | —                  | **write** |

### Schema, types, and explainer — no changes needed

**Schema:** The generated `provider-rule-permissions.v1.schema.json` already has
`additionalProperties` accepting any string key with an access-level value.
Pattern keys like `"*"` are valid via `additionalProperties`. Known permission
names remain in `properties` for IDE autocomplete. No structural schema changes
are needed.

**Types:** `Permissions = Record<string, PermissionAccess>` naturally
accommodates pattern keys. `PermissionsRule` is unchanged.

**Auth explainer:** Works entirely with the resolved `have` object (concrete
permission names and access levels), not the raw rule permissions. No changes
needed.

**Config parsing/validation:** The Ajv-based validation in `validation.ts`
accepts pattern keys via `additionalProperties`. No changes needed.

## Testing strategy

### Pattern interface

- `NamePattern`: verify `isLiteral` is `true` for `"contents"`, `false` for
  `"secret_*"` and `"*"`.
- `GitHubPattern`: verify `isLiteral` is `true` for `"account-a"` and
  `"account-a/repo-a"`, `false` when either part contains `*`.

### Token authorizer — permission pattern resolution

- **Pattern-only rules:** `{"*": "read"}` grants read to all requested
  permissions.
- **Mixed pattern and literal:** `{"*": "read", "contents": "write"}` — literal
  overrides pattern for `contents`.
- **Multiple patterns with max-wins:** `{"*": "read", "secret_*": "write"}` —
  `secret_scanning_alerts` gets write (max of read and write).
- **Literal de-escalation:** `{"*": "write", "contents": "none"}` — `contents`
  gets none via literal override.
- **Inter-rule override with patterns:** A literal rule followed by a pattern
  rule confirms that patterns in a later rule still override literals from an
  earlier rule (inter-rule "last wins" is independent of intra-rule
  literal-vs-pattern precedence).
- **No-match case:** A rule with `{"organization_*": "write"}` does not affect
  `contents`.
- **Existing tests pass unchanged** — current configs use only literal
  permission keys, which are patterns that happen to be literals.
