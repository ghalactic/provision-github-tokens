# Make token auth permission patterns use min-wins

## Problem statement

Permission rules currently use highest-access-wins when multiple pattern keys
match the same requested permission within a single rule. That can produce
surprising outcomes that grant more privilege than intended in ambiguous cases.
The broader project direction is to resolve ambiguity toward least privilege.

## Goals

- Resolve overlapping pattern matches within a rule using least privilege.
- Keep existing two-tier behavior where literal keys override pattern-derived
  access.
- Keep inter-rule ordering behavior unchanged.

## Non-goals

- Change explainer verbosity or output format.
- Change rule ordering semantics across multiple matching rules.
- Introduce specificity heuristics for pattern precedence.

## Design

### Resolution model

Permission resolution remains two-tier within each matching rule:

1. Pattern keys compute an access level for each requested permission.
2. Literal keys override the pattern result when present.

The pattern tier changes from max-wins to min-wins:

- If multiple patterns match a permission, choose the lowest access among the
  matching pattern entries.
- If one pattern matches, behavior is unchanged.
- If no pattern matches, the rule contributes no access for that permission.

Literal entries remain unconditional overrides in either direction. They can
raise or lower access relative to the pattern result.

### Rule ordering

Inter-rule behavior remains last-rule-wins. Matching rules are still applied in
order, and later rule outputs still overwrite earlier rule outputs.

### Why this model

- It aligns ambiguous pattern overlap with least privilege.
- It keeps the mental model simple: patterns are conservative defaults, literals
  are precise exceptions.
- It avoids introducing a pattern-specificity algorithm that is hard to define
  and explain.

## Data flow impact

The existing permission resolution flow is preserved:

1. Build pattern and literal collections from a rule.
2. Resolve access per requested permission from patterns.
3. Apply literal override per permission.
4. Merge rule result into accumulated output using existing last-rule-wins
   semantics.

Only step 2 changes from selecting the highest matched access to selecting the
lowest matched access.

## Error handling

No new error paths are introduced. Invalid permission names and access levels
continue to be handled by existing validation layers and rule parsing behavior.
Unexpected runtime failures continue to bubble through existing top-level error
handling.

## Testing strategy

Update unit tests for overlapping pattern matches to assert min-wins behavior.
Keep and validate these existing expectations:

- literal-over-pattern precedence for both escalation and de-escalation
- unchanged behavior for single-pattern matches
- unchanged last-rule-wins behavior across multiple rules

Add or update targeted cases where a broader pattern grants more access than a
narrower pattern to ensure the lower access now wins in the pattern tier.

## ADR impact

Create a new ADR that supersedes ADR-0002 and records the shift from max-wins to
min-wins for pattern-tier resolution, including rationale and consequences.
