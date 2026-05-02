---
name: diataxis
description:
  Structure, classify, and write documentation using the Diátaxis framework. Use
  when writing docs, README files, guides, tutorials, guides, API references, or
  organizing documentation architecture. Also use when asked to improve
  documentation, restructure docs, decide what type of doc to write, or classify
  existing content. Covers tutorials, guides, reference, and explainers.
---

# Diátaxis documentation framework

Apply the Diátaxis systematic framework to structure and write documentation.

## The four documentation types

Diátaxis identifies exactly four types, defined by two axes:

|                          | **Acquisition** (study) | **Application** (work) |
| ------------------------ | ----------------------- | ---------------------- |
| **Action** (doing)       | **Tutorial**            | **Guide**              |
| **Cognition** (thinking) | **Explainer**           | **Reference**          |

### 1. Tutorials — learning-oriented

Write tutorials as lessons. Take the learner by the hand through a practical
experience where they acquire skills by doing.

- Use first-person plural ("We will...")
- Show where they're going up front
- Deliver visible results early and often
- Ruthlessly minimize explanation — link to it instead
- Focus on the concrete, ignore options and alternatives
- Aspire to perfect reliability

### 2. Guides — goal-oriented

Write guides as practical directions for an already-competent user to achieve a
specific real-world goal.

- Name clearly: "How to [achieve X]"
- Use conditional imperatives ("If you want x, do y")
- Assume competence — don't teach
- Omit the unnecessary; practical usability > completeness
- Allow flexibility with alternatives

### 3. Reference — information-oriented

Write reference as technical description of the machinery. Keep it austere,
authoritative, consulted not read.

- Describe and only describe — neutral tone
- Adopt standard, consistent patterns
- Mirror the structure of the product
- Provide examples to illustrate, not explain

### 4. Explainer — understanding-oriented

Write explainers as discursive treatment that deepens understanding. Answer "Can
you tell me about...?"

- Make connections to related topics
- Provide context: why things are so
- Talk _about_ the subject (title: "About X")
- Admit opinion and perspective
- Keep closely bounded — don't absorb other types

## The compass — when in doubt

Ask two questions to classify content:

1. **Action or cognition?** Is this about doing, or thinking?
2. **Acquisition or application?** Is this for learning, or for working?

The intersection tells you which type you're writing.

## How to apply

1. Classify the content — use the compass questions above.
2. Check for type mixing — does this piece try to do two things at once?
3. Separate mixed content — pull explanation out of tutorials, pull instructions
   out of reference.
4. Apply the type's principles — follow the bullet points for that type above.
5. Link between types — don't embed, cross-reference instead.

Do NOT create empty four-section structures and try to fill them. Let structure
emerge from content.

## Example

User asks: "Write a getting-started guide for our CLI tool."

1. **Classify**: "Getting started" = the user is learning, by doing →
   **Tutorial**.
2. **Check**: Not a guide — the user isn't solving a specific problem, they're
   acquiring familiarity.
3. **Apply tutorial principles**:
   - Open with what they'll build: "In this tutorial, we will install the CLI
     and deploy a sample app."
   - Lead through concrete steps with visible results at each stage.
   - Minimize explanation: "We use `--verbose` for more output" not a paragraph
     on logging levels.
   - Link to reference for flag details, link to explainer for architecture.
4. **Result**: A focused lesson, not a feature tour disguised as a tutorial.

## Common mistakes

| Mistake                                                  | Why it fails                                                       | Fix                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Tutorial that explains everything                        | Explanation breaks the learning flow — learner loses focus         | Move explanation to a separate doc, link to it           |
| Guide that teaches basics                                | Competent users don't need onboarding — it wastes their time       | Assume competence, or split into tutorial + guide        |
| Reference with opinions and advice                       | Users consulting reference need facts, not guidance                | Move advice to explainer                                 |
| Explainer mixed into reference                           | Dilutes both — reference becomes verbose, explainer can't develop  | Separate into distinct documents                         |
| "Getting started" that's actually a feature tour         | No learning goal, no coherent journey — user doesn't acquire skill | Pick one thing the user will accomplish, build toward it |
| Creating empty Tutorials/Guides/Reference/Learn sections | Structure without content is useless scaffolding                   | Write content first, let structure emerge                |

## Critical rules

- **Never mix types.** Each type has its own purpose, tone, and form.
- **The user's mode matters.** Study vs. work is the fundamental distinction.
  Tutorials and explanation serve study. Guides and reference serve work.
- **Link between types** rather than embedding one inside another.

## Deep dives

Load references on demand for detailed guidance:

| Topic                            | URL                                        |
| -------------------------------- | ------------------------------------------ |
| Tutorials                        | https://diataxis.fr/tutorials/             |
| Guides                           | https://diataxis.fr/how-to-guides/         |
| Reference docs                   | https://diataxis.fr/reference/             |
| Explainers                       | https://diataxis.fr/explanation/           |
| The compass decision tool        | https://diataxis.fr/compass/               |
| Tutorials vs guides distinction  | https://diataxis.fr/tutorials-how-to/      |
| Reference vs explainers          | https://diataxis.fr/reference-explanation/ |
| Workflow methodology             | https://diataxis.fr/how-to-use-diataxis/   |
| Why Diátaxis works (foundations) | https://diataxis.fr/foundations/           |
| The two-dimensional map          | https://diataxis.fr/map/                   |
| Quality in documentation         | https://diataxis.fr/quality/               |
| Complex hierarchies              | https://diataxis.fr/quality/               |

## Where this project diverges from Diátaxis

- We use "guide" instead of "how-to guide" for brevity.
- We use "explainer" instead of "explanation" to avoid confusion with the verb.
- Where explainers need a section label, we use "Learn".
