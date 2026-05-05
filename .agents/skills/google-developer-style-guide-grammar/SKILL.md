---
name: google-developer-style-guide-grammar
description: >-
  Grammar rules from the Google developer documentation style guide. Covers
  articles (a/an/the), pronouns, present tense, contractions, and sentence
  structure.
---

# Google developer documentation style guide—grammar reference

## Articles (a, an, the)

### Core rule

Always include articles (`a`, `an`, `the`). Never drop them for brevity—
including in headings and titles.

| ✅ Do                    | ❌ Don't           |
| ------------------------ | ------------------ |
| Create **a** VM instance | Create VM instance |

### Articles before product names

- **Don't** use `the` before a product name used alone.
- **Do** use `the` when the product name modifies another noun.
- **Do** use `the` before tool and API names.

| ✅ Do                                     | ❌ Don't                                          |
| ----------------------------------------- | ------------------------------------------------- |
| Using Cloud Datastore with Cloud Dataproc | Using **the** Cloud Datastore with Cloud Dataproc |
| **The** Cloud Datastore options page      | —                                                 |
| **The** Google Cloud console              | —                                                 |
| **The** Transcoder API                    | —                                                 |
| **The** `gcloud` CLI                      | —                                                 |

When a product name follows an indefinite article (`a`/`an`), match the article
to the product name's pronunciation:

| ✅ Do                                  |
| -------------------------------------- |
| **An** Anthos Service Mesh environment |
| **A** Service Mesh environment         |

### Indefinite articles before abbreviations

Choose `a` or `an` based on **pronunciation** (not spelling). Use the
pronunciation most common for your audience.

- `a` before any **consonant sound** → `a SQL`, `a FHIR`
- `an` before any **vowel sound** → `an SAP`, `an API`

## Pronouns

### Ambiguous references

Every pronoun must clearly refer to its antecedent. Avoid vague `it`, `this`,
`these`.

| ✅ Do                                                                           | ❌ Don't                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| If you type text in the field, **the text** doesn't change.                     | If you type text in the field, **it** doesn't change.                     |
| The name of the function to execute. **The name** does not include parentheses. | The name of the function to execute. **It** does not include parentheses. |

### Demonstrative pronouns (`this`, `these`)

Follow demonstrative pronouns with a noun.

| ✅ Do                                       | ❌ Don't                         |
| ------------------------------------------- | -------------------------------- |
| Set **this value** to true.                 | Set **this** to true.            |
| **These approaches** are your best options. | **These** are your best options. |

### Gender-neutral pronouns

- Don't use `he`, `him`, `his`, `she`, `her` as gender-neutral.
- Don't use `he/she`, `(s)he`, or similar constructions.
- **Use singular `they`.**

### Optional pronouns (`that`, `which`)

Include optional relative pronouns to reduce ambiguity.

| ✅ Do                                                                      | ❌ Don't                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Right-click the link **that** you want to open.                            | Right-click the link you want to open.                       |
| Other option parameters, **which** are described in the following section. | Other option parameters, described in the following section. |

### Personal pronouns

- **Avoid** first-person (`I`, `we`, `us`, `our`, `ours`) except:
  - Questions in FAQs.
  - Documents where the author comments in first person.
  - Using `we` to refer to your organization (after naming it first).
- **Prefer** second-person (`you`).

### Relative pronouns (`that` vs `which` vs `who`)

| Pronoun | Clause type                     | Comma?                 | Effect                           |
| ------- | ------------------------------- | ---------------------- | -------------------------------- |
| `that`  | Restrictive (essential)         | No                     | Narrows to a specific subset.    |
| `which` | Non-restrictive (parenthetical) | Yes, preceded by comma | Adds extra info about all items. |

| Example                                            | Meaning                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| The echidna **that** has a long snout is furry.    | Only the long-snouted echidna is furry.            |
| The echidna, **which** has a long snout, is furry. | All echidnas are furry; they all have long snouts. |

- Use `who` (instead of `that`) when referring to a person; `that` is also
  acceptable if unsure.
- `whose` is the possessive of both `who` and `which`; it can refer to people,
  animals, and things.
  - ✅ Examine the variables **whose** values are set at compile time.

## Present tense

### Default: use present tense

Use present tense for general behavior not tied to a specific time.

| ✅ Do                                                 | ❌ Don't                                                  |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Send a query. The server **sends** an acknowledgment. | Send a query. The server **will send** an acknowledgment. |

### Exception: future events

Use future tense (`will`) only to describe an action that genuinely occurs later
/ asynchronously.

| ✅ Do (future is appropriate)                                                                             | Reason                                                 |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Add the filename to the backup list. The file **will be** archived the next time the backup process runs. | Action happens at a later time.                        |
| A message is sent that **will notify** any Pub/Sub subscribers.                                           | Messages are received asynchronously, not immediately. |

| ❌ Don't (incorrect future)                                  | Reason                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| A message is sent that **notifies** any Pub/Sub subscribers. | Implies synchronous delivery when it's actually async. |

### Avoid hypothetical `would`

| ✅ Do                                                                                 | ❌ Don't                                                                                         |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| If you send an unsubscribe message, the server **removes** you from the mailing list. | You can send an unsubscribe message. The server **would** then remove you from the mailing list. |

### Don't describe unreleased features with future tense

Do not use future tense to describe how a product or feature will work after the
next release or update.

## Contractions

### Use common contractions

Write in an informal tone. Use standard two-word contractions.

**Recommended contractions:** `you're`, `don't`, `it's`, `there's`, `isn't`,
`can't`, `won't`, `we're`, `that's`, `they're`, etc.

### Prefer negation contractions

Negation contractions (`isn't`, `don't`, `can't`) are preferred because a reader
scanning text can easily miss a standalone `not`, but is unlikely to misread
`don't` as `do`.

To emphasize the negative when needed, use `<em>` formatting: `is <em>not</em>`
→ renders as "is _not_." In most cases, emphasis is unnecessary.

### Contractions to avoid

| ❌ Avoid                                                                  | Reason                 |
| ------------------------------------------------------------------------- | ---------------------- |
| Non-standard contractions (`guides're`, `browser's` meaning "browser is") | Not standard English   |
| Three-word contractions (`mightn't've`)                                   | Too informal / unclear |

## Sentence structure

### Lead with context, conditions, or goals

Place the circumstance, condition, or purpose **before** the instruction. This
lets readers skip instructions that don't apply to them.

| ✅ Do                                                                                           | ❌ Don't                                                                                       |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| For more information, see [link].                                                               | See [link] for more information.                                                               |
| To delete the entire document, click **Delete**.                                                | Click **Delete** if you want to delete the entire document.                                    |
| If your app is located in one of the following regions, using custom domains might add latency: | Using custom domains might add latency if your app is located in one of the following regions: |

**Pattern:** _circumstance/condition/goal_ → _action/instruction_
