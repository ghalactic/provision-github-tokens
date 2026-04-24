# ADR review checklist

Use this checklist to validate an ADR before finalizing. The goal: **is this ADR
self-contained and specific enough that a future reader can understand why the
decision was made?**

## Checks

### Context and problem statement

- [ ] A reader with no prior context can understand why this decision exists
- [ ] The trigger is clear (what changed, broke, or is about to break)
- [ ] No tribal knowledge is assumed — acronyms are defined, systems are named
      explicitly
- [ ] No references to specific file paths, function names, or code symbols
- [ ] No references to GitHub issues or pull requests for context

### Decision

- [ ] The decision is specific enough to act on
- [ ] Scope is bounded — what's in AND what's out

### Consequences

- [ ] Each consequence is concrete and actionable, not aspirational
- [ ] Risks are stated with mitigation strategies or acceptance rationale
- [ ] No consequence is a disguised restatement of the decision

### Alternatives considered

- [ ] At least two options were genuinely considered (not just "do the thing" vs
      "do nothing")
- [ ] Rejected options explain WHY they were rejected, not just what they are

### Meta

- [ ] Status is set correctly (usually `proposed` for new ADRs)
- [ ] Date is set
- [ ] Decision-makers are listed
- [ ] Title is a verb phrase describing the decision (not the problem)
- [ ] Filename follows repo conventions
- [ ] All headings use sentence case

## Quick scoring

- **All checked**: Ship it.
- **1–3 unchecked**: Discuss the gaps with the human. Most can be fixed in a
  minute.
- **4+ unchecked**: The ADR needs more work. Go back to Phase 1 for the fuzzy
  areas.

## Common failure modes

| Symptom                              | Root cause              | Fix                                                       |
| ------------------------------------ | ----------------------- | --------------------------------------------------------- |
| "Improve performance" as consequence | Vague intent            | Ask: "improve which metric, by how much?"                 |
| Only one option listed               | Decision is post-hoc    | Ask: "what did you reject and why?"                       |
| Context reads like a solution pitch  | Skipped problem framing | Rewrite context as the problem, move solution to decision |
| Consequences are all positive        | Cherry-picking          | Ask: "what gets harder? what's the maintenance cost?"     |
| "We decided to use X" with no why    | Missing justification   | Ask: "why X over Y?"                                      |
| References specific file paths       | Implementation details  | Describe in terms of concepts and behavior instead        |
