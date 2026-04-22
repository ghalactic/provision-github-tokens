# Retro: Permission name patterns in permissions rules

> Implementation of [#39] via subagent-driven development.
>
> - Spec:
>   [`docs/superpowers/specs/2026-04-23-permission-name-patterns-design.md`]
> - Plan: [`docs/superpowers/plans/2026-04-23-permission-name-patterns.md`]

[#39]: https://github.com/ghalactic/provision-github-tokens/issues/39
[`docs/superpowers/specs/2026-04-23-permission-name-patterns-design.md`]:
  ../specs/2026-04-23-permission-name-patterns-design.md
[`docs/superpowers/plans/2026-04-23-permission-name-patterns.md`]:
  ../plans/2026-04-23-permission-name-patterns.md

## Summary

4 tasks, 6 commits (after rebase), 560 tests passing. Tasks 1–3 dispatched to a
fast/cheap model (mechanical one-line changes), Task 4 to a standard model (core
logic). All reviews passed first try — no rework cycles.

## Deviations from the plan

### Plan underestimated the blast radius of Task 4

Task 4 listed only two files to modify:

- `src/token-authorizer.ts`
- `test/suite/unit/token-auth/authorize-token-all-repos.spec.ts`

In practice, the behavioral change (only resolving _requested_ permissions
rather than copying all rule permissions into `have`) broke inline snapshots in
four additional test files:

- `test/suite/unit/token-auth/authorize-token-no-repos.spec.ts`
- `test/suite/unit/token-auth/authorize-token-selected-repos.spec.ts`
- `test/suite/unit/authorizer.spec.ts`

The snapshot changes were small and correct (rules that don't match any
requested permission are now skipped), but the plan should have predicted them.

**Lesson:** When a plan changes core shared behavior (like `updatePermissions`),
explicitly enumerate existing tests likely to be affected — don't just list new
test files.

### "No-match" inline snapshot prediction was wrong

The plan's expected output for the no-match test case was:

```
❌ Insufficient access to all repos in account-a based on 0 rules:
    (no matching rules)
```

The actual explainer produced:

```
❌ Insufficient access to all repos in account-a (no matching rules)
```

The plan had anticipated a format with "based on 0 rules:" that doesn't exist —
when zero rules match, the explainer uses a shorter format. The plan itself
noted "update the inline snapshots to reflect the actual output after verifying
correctness," so the implementer handled this fine, but the prediction was still
wrong.

**Lesson:** When writing inline snapshot expectations in plans, either verify
against the actual code path or explicitly mark them as predictions. A comment
like "approximate — verify against explainer" would have set the right
expectation.

### Reviews skipped for Tasks 1–3

The subagent-driven-development process calls for two-stage review (spec
compliance + code quality) after each task. Tasks 1–3 were single-property
additions — the coordinator verified diffs directly rather than dispatching
reviewer subagents.

This was a reasonable pragmatic call (reviewing a one-line `isLiteral: boolean`
addition is overhead), but it's a deviation from the process. Task 4 got the
full treatment.

**Lesson:** No action needed. The process should allow the coordinator to skip
reviews for trivially mechanical tasks — consider documenting this as a valid
shortcut in the skill.

## What went well

### Brainstorming produced a strong design

The collaborative brainstorming phase surfaced the right questions early:

- **DX concern:** The user raised the question of IDE autocomplete loss with
  pattern keys. Analysis of the existing schema (`additionalProperties` +
  explicit `properties`) showed autocomplete would be preserved — no separate
  `permissionsMatch` key needed.
- **Two-tier resolution:** Emerged naturally from discussing the `none`
  de-escalation edge case. The user specifically requested "literal keys
  unconditionally override patterns" after we walked through the scenario.
- **Match-against-requested:** The decision to match patterns against requested
  permissions (not all known GitHub permissions) avoided a hard-coded permission
  list and kept auth results clean.

### Self-review caught a missing test case

During plan writing, the self-review step identified that the "literal
escalation" test case (`"*": "read", contents: "write"`) was missing from the
initial draft. It was added before the plan was committed. This is exactly what
self-review is for.

### Model selection was cost-effective

Using a fast/cheap model for Tasks 1–3 (mechanical property additions) and a
standard model for Task 4 (core authorization logic) was the right split. All
subagents completed successfully on first dispatch — no re-dispatches with more
capable models needed.

### Zero rework cycles

All three reviews (spec compliance, code quality, final) passed on first
attempt. The plan was detailed enough (with exact code) that the implementer had
very little room for interpretation errors.

### Schema compatibility analysis avoided unnecessary work

Identifying early that the JSON schema already supports pattern keys via
`additionalProperties` eliminated an entire category of work (schema changes,
regeneration, config validation changes). The design spec explicitly called out
"no changes needed" for schema, types, explainer, and config parsing.

## What went less well

### Prettier oversight on the design spec

The design spec was committed without running Prettier first. The user's editor
reformats on save, so they immediately saw unstaged formatting diffs. This
triggered:

1. Amending the commit with Prettier changes
2. The user asking for AGENTS.md improvements
3. A separate commit updating AGENTS.md to make the instruction imperative

The agent instructions at the time said "Prettier formats Markdown
automatically" (passive/descriptive) rather than "Run Prettier before committing
any Markdown file" (imperative/actionable). The fix was applied during the
session.

**Root cause:** The agent instruction was informational rather than
prescriptive. The agent knew Prettier existed but didn't treat running it as a
required step.

### Plan was very detailed — almost pseudo-implementation

Task 4's plan included ~150 lines of exact code (types, functions, test cases).
This made the subagent's job straightforward but also means the plan was doing
most of the implementation thinking. The subagent was essentially transcribing
the plan into files.

This worked well for this feature (the design was well-understood, the code was
moderately complex), but for more exploratory work, this level of detail could
be premature and create rigidity.

**Consideration:** Is this the right level of detail for plans? It depends on
the task. For well-specified features with clear integration points, detailed
plans reduce subagent errors. For exploratory or ambiguous tasks, lighter plans
that focus on interfaces and constraints may be better.

### Duplicate AGENTS.md commit

The AGENTS.md change was committed on both the feature branch (`62991b0`) and
main (`43986f2`). During rebase, git automatically skipped the duplicate. This
worked out fine, but the duplication was messy.

**Consideration:** Incidental improvements discovered during feature work (like
fixing agent instructions) should probably be committed directly to main rather
than included in the feature branch. This avoids duplicate commits and keeps the
feature branch focused.

## Items for further consideration

### Behavioral change in existing tests — intentional but undocumented

The change from "copy all rule permissions into `have`" to "only resolve
requested permissions" is a semantic improvement, not just a refactor. The old
behavior was arguably a bug — `have` contained permissions the requester never
asked for, which cluttered auth results without affecting the allow/deny
decision.

However, this behavioral change wasn't explicitly called out in the design spec
or plan. The spec says "The resolved concrete `Permissions` object is then
applied to the accumulated `have` via `Object.assign`, exactly as before" — but
the _input_ to `Object.assign` changed (from all rule permissions to only
resolved ones). The "exactly as before" is misleading.

**Suggestion:** When a plan changes behavior, even if the change is an
improvement, the plan should have a "behavioral changes" section that explicitly
lists what changes and why. This helps reviewers and future readers understand
the intent.

### Test coverage for no-repos and selected-repos paths

All 6 new test cases are in `authorize-token-all-repos.spec.ts`. The plan
justified this: "The tests use the all-repos path for simplicity, but the change
applies to all three authorization paths because they all share
`updatePermissions`."

This is correct — the three paths share the same `updatePermissions` and
`resolvePermissions` functions. But the integration points differ (how each path
calls `updatePermissions` and what it does with the return value). If a future
change introduces divergence between the paths, the pattern tests won't catch
it.

**Suggestion:** Consider adding at least one pattern test for each of the
no-repos and selected-repos paths in a follow-up, to guard against future
divergence.

## Suggestions for agent instruction improvements

### Already applied during this session

- **AGENTS.md:** Changed Markdown/Prettier instruction from descriptive to
  imperative, with exact command.

### Suggested for future consideration

- **Plan writing guidance:** When a task modifies shared/core functions, the
  plan should list all callers and their test files, not just the primary test
  file. A "blast radius" section would help.
- **Inline snapshot predictions:** Plans should mark inline snapshot
  expectations as approximate when they haven't been verified against the actual
  code path. Something like `<!-- approximate snapshot -->` in the plan.
- **Behavioral changes in specs:** Design specs should have an explicit
  "behavioral changes" section when the implementation changes observable
  behavior, even if the change is an improvement.
- **Subagent-driven-development skill:** Document that the coordinator may skip
  two-stage reviews for trivially mechanical tasks (e.g., single-property type
  additions), to avoid wasting review cycles on obvious changes.
