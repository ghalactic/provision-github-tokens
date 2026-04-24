# ADR conventions

## Directory

ADRs live in `docs/adrs/`. This is the only supported location.

## Filename conventions

Pattern: `NNNN-title-with-dashes.md`

- `NNNN` is a zero-padded four-digit sequential number.
- Title uses lowercase dashes and imperative verb phrases.
- Examples: `0001-choose-database.md`,
  `0022-distinguish-requester-and-consumer.md`

## Sections

Every ADR must include at minimum:

1. **Context and problem statement** — why the decision exists now, what
   constraints apply
2. **Decision** — what was chosen and why
3. **Consequences** — what becomes easier or harder, risks, costs, follow-ups

Optional sections (include only when they add value):

- **Alternatives considered** — options that were rejected and why
- **More information** — related ADRs, revisit triggers

## Headings

All headings use **sentence case** — capitalize the first word only, no title
case. Examples: "Context and problem statement", "Alternatives considered".

## Status values

Track status in YAML front matter:

```yaml
---
status: proposed
date: 2025-06-15
decision-makers: Alice, Bob
---
```

| Status                                   | Meaning                                                       |
| ---------------------------------------- | ------------------------------------------------------------- |
| `proposed`                               | Under discussion, not yet decided                             |
| `accepted`                               | Decision is active and should be followed                     |
| `rejected`                               | Considered but explicitly not adopted                         |
| `deprecated`                             | Was accepted but no longer applies — explain replacement path |
| `superseded by [ADR-NNNN](NNNN-link.md)` | Replaced by a newer ADR — always link both ways               |

## YAML front matter fields

| Field             | Required | Description                 |
| ----------------- | -------- | --------------------------- |
| `status`          | Yes      | Current lifecycle state     |
| `date`            | Yes      | Date of last status change  |
| `decision-makers` | Yes      | People who own the decision |

## Content guidelines

- **No file paths or code symbols.** Describe decisions in terms of concepts and
  behavior so ADRs are resilient to refactoring.
- **No GitHub issue or PR references.** ADRs must be self-contained — a reader
  must understand the decision from the ADR alone.
- **Be concise.** Only include sections that earn their keep. Drop optional
  sections unless they add real value.

## Mutability

- ADRs on the current feature branch can be edited directly.
- ADRs already on the `main` branch must be updated by creating a new
  superseding ADR, not by editing the original.
- Status changes and after-action notes are fine to edit in-place.

Alternative: use tags or a flat structure with a searchable index.
Subdirectories are simpler and work with all tools.
