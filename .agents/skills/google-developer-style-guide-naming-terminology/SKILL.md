---
name: google-developer-style-guide-naming-terminology
description: >-
  Naming and terminology rules from the Google developer documentation style
  guide. Covers capitalization, abbreviations, spelling, and jargon.
---

# Capitalization

## General rules

- Follow standard American English capitalization rules.
- Don't capitalize without a reason.
- Don't rely on capitalization alone to convey meaning (e.g., Kubernetes _Pod_
  vs. generic _pod_—too subtle for many readers).
- Don't use ALL-CAPS except in: official names, abbreviations that are always
  all-caps, or references to all-caps code.
- Don't use camelCase except in official names or references to camelCase code.
- For specific word capitalization, consult the Google style guide word list.

## Titles and headings

- Use **sentence case**: capitalize only the first word, first word after a
  colon in a subheading, and proper nouns/always-capitalized terms.
- Don't put a period at the end of a title or heading.
- **References to titles/headings**: use sentence case even if the original uses
  title case (so references will match when the original is updated). Retain
  original capitalization only for titles of works that don't follow this guide.

## After colons

Lowercase the first word after a colon **unless** it is:

- A proper noun—_Open source software: Hadoop_
- A heading
- A quotation—_Arthurian wit: "Bring me yon sworde"_
- Text following a label like _Caution_ or _Note_

## Figures

- Sentence case for captions, labels, callouts, and all text in images/diagrams.

## Glossaries and indexes

- Lowercase terms unless proper noun or otherwise required.
- Sentence case for glossary definitions.

## Hyphenated words

- At start of sentence/heading: capitalize only the first element, unless a
  later element is a proper noun/adjective.

## Lists

- Sentence case for all list items.

## Tables

- Sentence case for all table elements: contents, headings, labels, captions.

## Casing style names

- Don't use names like _camel case_ or _snake case_ to describe casing styles—
  they don't localize well and aren't standardized.
- Instead, describe the format and provide an example.

> **Do:** Enter the value in the format where there are no spaces between words
> and the first letter of each word is capitalized—for example,
> `AssertionAccount`.
>
> **Don't:** Enter the value in camel case.

---

# Abbreviations

## Definitions

| Type           | Formed from             | Pronounced as      | Examples                |
| -------------- | ----------------------- | ------------------ | ----------------------- |
| Acronym        | First letters of phrase | A word             | NATO, scuba             |
| Initialism     | First letters of phrase | Individual letters | CIA, FYI, PR            |
| Shortened word | Part of word/phrase     | —                  | Dr., etc., min, CA      |
| Contraction    | —                       | —                  | (see Contractions page) |

In most contexts, using _acronym_ for both acronyms and initialisms is fine.

## Long vs. short word forms

Some words have long and short forms (e.g., _application_/_app_,
_demonstration_/_demo_, _synchronize_/_sync_). Short forms are **not**
abbreviations—no period needed. Use the speaking test: if you say the short form
as a word, treat it as a word.

## When to use abbreviations

- **Do** use standard acronyms/initialisms that save the reader time.
- **Do** spell out on first reference (see below).
- **Don't** abbreviate terms unrelated to the document's main topic.

> **Do:** The internet of things (IoT) service can even be used for connecting
> to sensors in low Earth orbit.
>
> **Don't:** The IoT (internet of things) service can even be used for
> connecting to sensors in LEO (low Earth orbit).

- **Don't** use specialized abbreviations your readers might not understand
  without considering the audience.

## When to spell out a term

- Spell out on first mention if the abbreviation is likely unfamiliar; put the
  abbreviation in parentheses immediately after.

> **Do:** _Border Gateway Protocol_ (_BGP_)

- Use the abbreviation alone for all subsequent mentions.
- If used only once, include the abbreviation only if it's as commonly known as
  the spelled-out term.
- If the first mention is in a heading, you may use the abbreviation there and
  spell it out in the first paragraph after.
- Consider your audience: spelling out helps translators and non-native English
  readers.
- Don't spell out if the spelled-out form doesn't aid understanding (e.g.,
  _portable document format_ doesn't clarify _PDF_).

### Abbreviations that rarely need spelling out

AI, API, DVD, file formats (PDF, XML), HTML, PC, RAM, REST, units of measurement
(MB, MiB, GB, GiB), URL, USB.

## Formatting abbreviation introductions

- **Italicize** both the spelled-out term and the abbreviation in parentheses.

> **Do:** Establish _Border Gateway Protocol_ (_BGP_) sessions...
>
> **Don't:** Establish _Border Gateway Protocol_ (BGP) sessions...

- **Capitalize** the spelled-out form only if it's a proper noun or
  conventionally capitalized. Don't capitalize just because the abbreviation has
  capitals.

> **Do:** data manipulation language (DML)
>
> **Don't:** Data Manipulation Language (DML)

- Include the abbreviation in link text.

## Abbreviations not to use

| Don't use                | Use instead                                        |
| ------------------------ | -------------------------------------------------- |
| i.e.                     | that is                                            |
| e.g.                     | for example                                        |
| tl;dr, ymmv, RTFM        | Write out meaning in non-figurative language       |
| approx. (and similar)    | Use the full word if it's common (_approximately_) |
| 10x (meaning "10 times") | _10 times_                                         |

- _etc._ is okay in some cases, but prefer alternative phrasing in most lists.

## Periods with abbreviations

| Context                             | Period?               |
| ----------------------------------- | --------------------- |
| Acronyms and initialisms            | No                    |
| Shortened words                     | Yes (e.g., Dr., etc.) |
| Date/time abbreviations             | No                    |
| Words spoken as words (app, sync)   | No                    |
| Country, US state, DC abbreviations | No                    |

## Abbreviations as verbs

Don't use acronyms, initialisms, or shortened words as verbs.

> **Do:** Use SSH to log in to your remote shell.
>
> **Don't:** Then ssh into your remote shell.

## Indefinite articles (a/an) before abbreviations

Base on **pronunciation**, not spelling: _a_ before consonant sounds, _an_
before vowel sounds. Specific preferences from the word list: _a SQL_, _a FHIR_,
_an SAP_.

---

# Spelling

## General rules

- Use **American English** spelling.
- Use **Merriam-Webster** as the primary dictionary reference.
- When Merriam-Webster lists multiple spellings, use the **first form** (most
  common). Example: _canceled_ (not _cancelled_).
- For terms not in Merriam-Webster, check the Google style guide word list.

## Word list guidance levels

| Label                                                 | Meaning                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Use with caution**                                  | Avoid when possible; term may be ambiguous/obscure. Alternatives suggested. OK if needed—define or use once. |
| **Don't use**                                         | Preferred to never use. May be ambiguous, offensive, or non-inclusive. If in code, replace or write around.  |
| **Android** / **Google Cloud** / **Google Workspace** | Guidance applies only to that product's documentation.                                                       |

## Key spelling/usage entries (selected)

| Term                              | Guidance                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| canceled, canceling, cancellation | Use single-_l_ forms (_canceled_, _canceling_) but _cancellation_ (double-_l_)                                                            |
| & (ampersand)                     | Don't use instead of _and_ in headings, text, nav, or TOCs. OK in UI references, constrained table headings, and code.                    |
| + (with numbers)                  | OK in text (e.g., _300+ attributes_), not in formal contexts                                                                              |
| above                             | Don't use for version ranges (use _later_), document position (use _earlier_/_preceding_), or UI position. OK for hierarchy descriptions. |
| about vs. on                      | Use _about_ (not _on_) when describing what a cross-reference links to                                                                    |
| access (verb)                     | Avoid; prefer _see_, _edit_, _find_, _use_, or _view_                                                                                     |
| a / an                            | Based on next word's sound, not letter                                                                                                    |

---

# Jargon

## Definition

Jargon is specialized, often figurative terminology of a specific group (e.g.,
_camel case_, _swim lane_, _break-glass procedure_, _out-of-the-box_). Also
includes vaguely defined/overloaded terms (_solution_, _support_, _workload_).

## Why it matters

Jargon can hamper clarity for global audiences, multilingual readers, varying
expertise levels, and inclusive communication.

## When jargon is acceptable

Some jargon is widely understood by the intended audience or needed for SEO.
Before using, apply the following decision framework:

### Decision framework

1. **Can you write around the term?** If not needed for SEO, rephrase.

   > **Do:** When the project is finished, review what processes worked or
   > didn't work.
   >
   > **Don't:** Hold a post-mortem.

   > **Do:** Use an informal design process.
   >
   > **Don't:** Create a back-of-the-envelope design.

2. **Can you replace with a more specific term?** Use alternatives from the word
   list:

   | Jargon        | Preferred replacement         |
   | ------------- | ----------------------------- |
   | blast radius  | affected area, spatial impact |
   | ingest        | import, load                  |
   | off-the-shelf | ready-made, pre-built         |

   If the word list marks a term as "Don't use" (offensive, violent,
   non-inclusive), always replace or write around it.

3. **Used only once in the document?** Describe in plain language and put the
   jargon term in parentheses, or link to a trusted definition.

   > **Do:** You then move the task to an earlier part of the process (also
   > known as _shifting left_).
   >
   > **Do:** A
   > [split-brain](https://en.wikipedia.org/wiki/Split-brain_%28computing%29)
   > situation can develop.

4. **Used throughout the document?** Briefly describe in parentheses on first
   reference, or link to a trusted definition.

   > **Do:** The application is in the same state as a _cold standby_ (a backup
   > or redundant system that's identical to a primary system).
   >
   > **Do:** A better approach is to use a pattern called a
   > [_dead letter queue_](https://en.wikipedia.org/wiki/Dead_letter_queue).

5. **Term used in a command or code sample?** Use the term only in direct
   reference to code items (formatted as code), and clarify what you're
   referring to.

   > **Do:** Add a user to the allowlist (`whitelist`) by entering the
   > following: `whitelist adduser EMAIL_ADDRESS`.
   >
   > **Don't:** Add a user to the whitelist by entering the following:
   > `whitelist adduser EMAIL_ADDRESS`.
