---
name: adr-skill
description:
  Create and maintain Architecture Decision Records (ADRs). Use when you need to
  propose, write, update, accept/reject, deprecate, or supersede an ADR; consult
  existing ADRs before implementing changes; or enforce ADR conventions. This
  skill uses Socratic questioning to capture intent before drafting.
---

# ADR skill

## Philosophy

ADRs capture **why** a decision was made so that future contributors can
understand the reasoning. They are architectural documentation, not
implementation documentation.

**Brevity is a core value.** ADRs should be as short as possible while remaining
self-contained. A good ADR is closer to a commit message with rationale than to
a design document. Aim for the shortest text that a reader new to the project
could understand without follow-up questions.

Concrete rules:

- Be concise — favor short sentences and tight bullet points over flowing prose
- Only include sections that earn their keep — drop optional sections ruthlessly
- Do not enumerate things the reader can infer — one or two illustrative
  examples beat an exhaustive list
- Do not restate the same point in different words across sections
- ADRs must be self-contained — no tribal knowledge assumptions
- Decisions must be specific enough to act on
- Do not reference specific file paths, function names, or code symbols —
  describe decisions in terms of concepts and behavior so they are resilient to
  refactoring
- Do not reference GitHub issues or pull requests for context
- Consequences must be concrete, not aspirational

## Writing style

Use **sentence case** for all headings, labels, and prose — never title case.

## When to write an ADR

Write an ADR when a decision:

- **Changes how the system is built or operated** (new dependency, architecture
  pattern, infrastructure choice, API design)
- **Is hard to reverse** once code is written against it
- **Affects other people or agents** who will work in this codebase later
- **Has real alternatives** that were considered and rejected

Do NOT write an ADR for:

- Routine implementation choices within an established pattern
- Bug fixes or typo corrections
- Decisions already captured in an existing ADR (update it instead)
- Style preferences already covered by linters or formatters

When in doubt: if a future contributor would benefit from knowing _why_ this
choice was made, write the ADR.

### Proactive ADR triggers (for agents)

If you are an agent coding in a repo and you encounter any of these situations,
**stop and propose an ADR** before continuing:

- You are about to introduce a new dependency that doesn't already exist in the
  project
- You are about to create a new architectural pattern that other code will need
  to follow
- You are about to make a choice between two or more real alternatives and the
  tradeoffs are non-obvious
- You are about to change something that contradicts an existing accepted ADR
- You realize you're writing a long code comment explaining "why" — that
  reasoning belongs in an ADR

**How to propose**: Tell the human what decision you've hit, why it matters, and
ask if they want to capture it as an ADR. If yes, run the full workflow below.

## Creating an ADR

Every ADR goes through three phases. Do not skip phases.

### Phase 1: Gather context and capture intent

Before asking questions, scan the codebase:

1. **Find existing ADRs.** Look in `docs/adrs/`. Read any that relate to or
   constrain the current decision. Note any ADRs this new decision might
   supersede.

2. **Note what you found.** Carry this context into the interview — it will
   sharpen your questions and prevent contradictions.

Then interview the human to understand the decision space. Ask questions **one
at a time**, building on previous answers. Do not dump a list of questions.

**Core questions** (skip what's already clear from context):

1. **What are you deciding?** — Get a short, specific title.
2. **Why now?** — What broke, what's changing, or what will break if you do
   nothing?
3. **What constraints exist?** — Be concrete. Reference what you found in the
   codebase.
4. **What options have you considered?** — At least two. For each: what's the
   core tradeoff?
5. **What's your current lean?** — Capture gut intuition early.

**Adaptive follow-ups** — probe deeper where the decision is fuzzy:

- "Is there anything you're explicitly choosing NOT to do?"
- "What prior art or existing patterns in the codebase does this relate to?"
- "I found [existing ADR] — does this new decision interact with it?"

**When to stop**: You have enough when you can fill every section of the ADR
without making things up.

**Intent summary gate**: Before moving to Phase 2, present a structured summary
and ask the human to confirm or correct it:

> **Here's what I'm capturing for the ADR:**
>
> - **Title**: {title}
> - **Trigger**: {why now}
> - **Constraints**: {list}
> - **Options**: {option 1} vs {option 2} [vs ...]
> - **Lean**: {which option and why}
> - **Related ADRs**: {what exists that this interacts with}
>
> **Does this capture your intent? Anything to add or correct?**

Do NOT proceed to Phase 2 until the human confirms the summary.

### Phase 2: Draft the ADR

**Keep it short.** Prefer a few precise sentences over comprehensive
enumeration. If a section has only one bullet, consider writing it as a
sentence. If the context can be stated in two sentences, don't use four.

1. **Use the existing ADR directory** (`docs/adrs/`).

2. **Continue the numeric prefix convention** (`0001-...`). Determine the next
   number from existing files.

3. **Use the template** from `assets/templates/adr.md`. Fill every section from
   the confirmed intent summary. Do not leave placeholder text. Remove optional
   sections that don't earn their keep.

4. **Generate the file.** Preferred: run `scripts/new_adr.js` (handles
   directory, naming, and optional index updates). Otherwise create the file
   manually.

### Phase 3: Review

After drafting, review the ADR against the checklist in
`references/review-checklist.md`.

Present the review as a brief summary, not a raw checklist dump:

> **ADR review**
>
> ✅ **Passes**: {what's solid}
>
> ⚠️ **Gaps found**:
>
> - {specific gap with proposed fix}
>
> **Recommendation**: {Ship it / Fix the gaps first}

Only surface failures and notable strengths. If there are gaps, propose specific
fixes. Do not finalize until the ADR passes the checklist or the human
explicitly accepts the gaps.

## Consulting ADRs

Agents should read existing ADRs **before implementing changes** in a codebase
that has them.

### When to consult ADRs

- Before starting work on a feature that touches architecture
- When you encounter a pattern in the code and wonder "why is it done this way?"
- Before proposing a change that might contradict an existing decision
- When a human says "check the ADRs" or "there's a decision about this"

### How to consult ADRs

1. **List the ADR directory.** Focus on `accepted` ADRs — these are active
   decisions.
2. **Read relevant ADRs fully.** Don't just read the title — read context,
   decision, and consequences.
3. **Respect the decisions.** If an accepted ADR says "use X," don't switch to Y
   without creating a new ADR that supersedes it. If you find a conflict between
   what the code does and what the ADR says, flag it to the human.

## Updating an existing ADR

**ADRs on the current feature branch** can be edited directly.

**ADRs already on main** must be updated by creating a new superseding ADR, not
editing the original.

For status changes, use `scripts/set_adr_status.js` (supports YAML front matter,
bullet status, and section status).

Operations:

- **Accept / reject**: change status, add any final context.
- **Deprecate**: status → `deprecated`, explain replacement path.
- **Supersede**: create a new ADR, link both ways (old → new, new → old).
- **Add learnings**: append to `## More information` with a date stamp. Do not
  rewrite history.

## Resources

### scripts/

- `scripts/new_adr.js` — create a new ADR file from the template.
- `scripts/set_adr_status.js` — update an ADR status in-place. Use `--json` for
  machine output.

### references/

- `references/review-checklist.md` — review checklist for Phase 3.
- `references/adr-conventions.md` — directory, filename, status, and lifecycle
  conventions.
- `references/examples.md` — filled-out example ADRs.

### assets/

- `assets/templates/adr.md` — the ADR template.

### Script usage

From the target repo root:

```bash
node /path/to/adr-skill/scripts/new_adr.js --title "Choose database" --status proposed
node /path/to/adr-skill/scripts/new_adr.js --title "Choose database" --status proposed --update-index
```

Notes:

- Scripts auto-detect ADR directory and filename strategy.
- Use `--dir` and `--strategy` to override.
- Use `--json` to emit machine-readable output.
