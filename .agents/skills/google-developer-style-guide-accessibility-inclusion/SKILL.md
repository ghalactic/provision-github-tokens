---
name: google-developer-style-guide-accessibility-inclusion
description: >-
  Accessibility and inclusion rules from the Google developer documentation
  style guide. Covers accessible documentation, inclusive language, and writing
  for a global audience.
---

# Accessible documentation

## General rules

- Don't use ableist language.
- Ensure all parts of the document (tabs, buttons, interactive elements) are
  reachable by keyboard alone.
- Test documentation with a screen reader.
- In HTML, use semantic tagging (e.g., `em` for emphasis, not for italics).
- In HTML, prefer native elements over custom styles.
- Avoid unnecessary font formatting (screen readers explicitly describe text
  modifications).
- Document specialized accessibility features of the product explicitly.
- Don't force line breaks (hard returns) within sentences/paragraphs—breaks fail
  in resized windows or enlarged text.
- Avoid camelCase and ALL CAPS—some screen readers read capitals individually;
  some languages are unicase.
- Not all punctuation is read by screen readers. Convey meaning without relying
  on punctuation. Avoid exclamation marks, question marks, and semicolons when
  possible.
- Don't use `&` instead of _and_ in headings, text, navigation, or TOCs.
  **Exceptions:** OK when referencing UI elements that use `&`, in table
  headings/diagram labels with space constraints, and in code.

## Ease of reading

- Break up walls of text: use paragraphs, headings, lists.
- Use shorter sentences (< 26 words).
- Define acronyms/abbreviations on first use and if used infrequently.
- Use parallel structure for similar items (e.g., start each list item the same
  way).
- Put distinguishing/important info in the first sentence of each paragraph.
- Use clear, direct language. Avoid double negatives and exceptions to
  exceptions.

| Do                               | Don't                                             |
| -------------------------------- | ------------------------------------------------- |
| You can continue without a path. | A missing path won't prevent you from continuing. |

- Left-align text. Don't center or full-justify.

## Headings and titles

- Use a heading hierarchy; don't skip levels (e.g., `h3` only under `h2`).
- To change heading appearance, use CSS—don't pick a wrong heading level.
- No empty headings or headings with no associated content.
- Tag headings with heading elements (`h1`–`h6` in HTML; `#`–`######` in
  Markdown).
- Use level-1 heading for page title / main content heading.

## Links

- Use meaningful link text—links must make sense when read out of context.

| Do                                                    | Don't                      |
| ----------------------------------------------------- | -------------------------- |
| For more information, see [Accessible documentation]. | [Click here] to read more. |

- Use _see_ to refer to links and cross-references.
- When a link downloads a file, opens a new tab, or jumps to another section,
  explain that behavior.
- Avoid adjacent links; separate them with a character.

## Lists

- In a procedure, make each instruction a list item.
- Use lists to help readers follow steps.

## Images

- Every image must have an `alt` attribute. Use descriptive alt text summarizing
  intent, or empty alt text for decorative images.
- Don't present new information only in images—always provide equivalent text.
- Don't repeat images unless absolutely necessary.
- Don't use images of text, code samples, or terminal output—use actual text.
- Prefer SVG over PNG (SVGs stay sharp when zoomed).

## Videos, recordings, and GIFs

- Provide captions, transcripts, or descriptions for all audio/video content.
- Ensure captions can be translated into major languages.
- Don't use flickering or flashing elements (risk of motion sickness or
  seizures).

## Buttons and icons

- For form-submission buttons, use native HTML `<button>`.
- For icon guidance, refer to product-specific UI element guidelines.

## UI navigation

- When using `>` for menu paths, add `aria-label` so screen readers say "and
  then" instead of "greater than."

## Tables

- Introduce tables in preceding text (not all screen readers preannounce
  tables).
- Use `<th>` for first column and first row headings only.
- If a table has both row and column headings, use the `scope` attribute.
- If multiple rows contain column headings, use the `headers` attribute with
  unique IDs.
- Avoid tables in the middle of numbered procedures.
- Don't merge cells (`colspan`/`rowspan`).
- Don't use tables unless they're the best way to present the information.
- Don't convey new information through images/symbols alone in tables—always
  provide a descriptive `alt` attribute.

## Interactive elements

- Introduce interactive elements (e.g., expanders) in the preceding text.

| Do                                                                  | Don't               |
| ------------------------------------------------------------------- | ------------------- |
| To see a list of requirements, expand the **Requirements** section. | _(no introduction)_ |
| To see a list of requirements, click the expander arrow.            | _(no introduction)_ |

## Forms

- Label every input field with a `<label>` element.
- Place labels outside of fields.
- Error messages for form validation must clearly state what went wrong and how
  to fix it (e.g., "Name is a required field.").

## Custom CSS and JavaScript

- Use standard site styles and JS as much as possible.
- Accessible color contrast: 4.5:1 ratio minimum for text.
- Don't use `visibility:hidden` or `display:none`—both hide content from screen
  readers.
- Avoid `mouseover` events; if used, add alternate `focus` and `blur` events for
  keyboard users.
- Ordering/positioning in CSS must reflect DOM and reading order (left-to-right,
  top-to-bottom).

## Document rendering

Verify the document conveys all information when viewed:

- Without sound
- Using only sound
- Without images (including animation)
- Without color
- Using only a keyboard
- With screen magnification
- Without punctuation

**Don't use color, size, location, or other visual cues as the primary means of
communicating information.**

- If using color/icon/outline-thickness for state, also provide a secondary cue
  (e.g., text label change).
- Refer to buttons/elements by their label. For visual elements without text,
  use the element's `aria-label`.

| Do                       | Don't                          |
| ------------------------ | ------------------------------ |
| Click **Save**.          | _(describe visual appearance)_ |
| Click **Notifications**. | Click the bell icon.           |

- Don't use directional language (_above_, _below_, _right-hand side_)—fails for
  accessibility and RTL localization.
- Don't use directional terms for document position. Use _earlier_, _preceding_,
  or _following_ instead.

| Do                            | Don't                                                      |
| ----------------------------- | ---------------------------------------------------------- |
| In the preceding diagram, ... | In the diagram above, ...                                  |
| Click **Menu**.               | In the left-side panel, click the button with three lines. |

---

# Inclusive documentation

## Ableist language

Avoid words/phrases: _crazy_, _insane_, _blind to / blind eye to_, _cripple_,
_dumb_, _sanity check_, _dummy variable_.

| Do                                                                                | Don't                                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Give everything a final check for completeness and clarity.                       | Give everything a final sanity-check.                                           |
| There are some baffling outliers in the data.                                     | There are some crazy outliers in the data.                                      |
| It slows down the service, causing a poor user experience until the queue clears. | It cripples the service, causing a poor user experience until the queue clears. |
| Replace the placeholder in this example with the appropriate value.               | Replace the dummy variable in this example with the appropriate value.          |

## Gendered language

Avoid unnecessarily gendered terms. Use gender-neutral pronouns in narrative
examples.

| Do                                                   | Don't                                             |
| ---------------------------------------------------- | ------------------------------------------------- |
| Equipment installation takes around 16 person-hours. | Equipment installation takes around 16 man-hours. |
| ...help all of humanity.                             | ...help all of mankind.                           |

## Violent language

- Avoid graphically violent or harmful terms (e.g., _STONITH_). Describe the
  process instead.
- If a violent term is unavoidable, mention it once (parenthetically) on first
  use, then use the inclusive term thereafter.

| Do                                            | Sometimes OK                                                                     | Don't                       |
| --------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------- |
| This might require you to fence failed nodes. | This might require you to fence failed nodes (sometimes referred to as STONITH). | _(use violent term freely)_ |

- Avoid figurative language with violent interpretations (_hang_, _hit_) even if
  nonviolent readings exist.
- Avoid metaphors involving animal slaughter (e.g., _pets vs. cattle_ for
  stateful vs. stateless systems).

## Diverse and inclusive examples

- Use diverse names, genders, ages, and locations in examples.
- Follow gender-neutral pronoun guidance.
- Avoid US-centric cultural references (holidays, sports, figures of speech).
- Choose a diverse set of names reflecting real-world audience diversity.
- For older adults: avoid _the elderly_, _the aged_, _seniors_, _senior
  citizens_, _80 years young_. Use _older adults_, _aging population_, or
  mention relative age/relationship when relevant.

## Inclusive feature/user references

- Don't refer to people in divisive ways (e.g., _native speakers_ / _non-native
  speakers_).
- Avoid socially charged terms for technical concepts:

| Do                         | Don't                 |
| -------------------------- | --------------------- |
| allowlist                  | blacklist / whitelist |
| primary / replica / parent | master / slave        |
| built-in feature           | native feature        |
| _(describe the concept)_   | first-class citizen   |

### Replacing established non-inclusive terms

If replacing an established term could cause confusion:

1. On first use, refer to the non-inclusive term in parentheses.
2. Use the inclusive replacement term for the rest of the document.

| Example                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- |
| Add them to an allowlist (sometimes called a _whitelist_). Anyone who isn't on the allowlist is blocked ... |
| A Jenkins controller (master) handles HTTP requests. The Jenkins controller is designed to ...              |
| Servers are treated as commodities (sometimes described by using the metaphor _cattle, not pets_).          |

When possible, rewrite instead of direct word replacement:

| Do                                                                                                        | Don't                                                                                           |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| You can allow requests from a range of IP addresses by entering a CIDR block instead of a single address. | You can allowlist a range of IP addresses by entering a CIDR block instead of a single address. |

### Writing around non-inclusive code terms

When non-inclusive terms are embedded in code (names, keywords) and can't be
ignored:

- Minimize use of the term; don't propagate it as a term of art.
- Only use the non-inclusive name/keyword in code font.
- On first reference, put the code term in parentheses if possible.
- In subsequent mentions, use the preferred term; only refer to the code entity
  with code formatting.

| Do                                                                                           | Don't                            |
| -------------------------------------------------------------------------------------------- | -------------------------------- |
| The configuration file helps you create a parent node (which is named `master` in the file). | _(use "master" freely in prose)_ |
| Start the replica by using the `START SLAVE` statement.                                      | _(use "slave" freely in prose)_  |

## Disability and accessibility language

- Don't describe people without disabilities as _normal_ or _healthy_. Use:
  _nondisabled person_, _sighted person_, _hearing person_, _person without
  disabilities_, _neurotypical person_.
- Avoid terms that remove personhood or define people by disability. Use
  person-first language: _people with disabilities_, _a quadriplegic person_—
  not _the disabled_, _a quadriplegic_.
  - **Exception:** Some communities prefer identity-first language (common in
    autistic, blind, Deaf communities). Research and respect community
    preferences. Capitalization varies (e.g., _Deaf_ vs. _deaf_).
- Use _see_ to refer to links/cross-references (this is standard, not ableist).
- Avoid projecting feelings: not _victim of_, _suffering from_,
  _wheelchair-bound_. Use _experiencing_, _living with_, _uses a wheelchair_.
- Avoid euphemisms: not _physically challenged_, _special_, _differently abled_,
  _handi-capable_.

---

# Writing for a global audience

## Key definitions

| Term                 | Meaning                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Localization         | Adapting a product and docs for a specific country (currencies, units, etc.)—more than translation. |
| Translation          | Converting one language to another; may involve localization but not synonymous.                    |
| Internationalization | Designing a product/docs to minimize localization effort (e.g., externalizing UI strings).          |

## Clear, concise, unambiguous language

### Simpler words, shorter sentences

- Use simple words.

| Do            | Don't              |
| ------------- | ------------------ |
| start / begin | commence           |
| so            | consequently       |
| use           | utilize / leverage |

- **Exception:** OK when conveying a special technical sense (e.g., "Cloud
  Spanner utilizes up to 100% of the available CPU resources").
- Use a single word instead of a phrase: _some_ or _many_ instead of _a number
  of_.
- Write shorter sentences. English sentences often expand when translated; long
  sentences impair understanding, cause rendering issues, and increase
  translation costs.

### Avoid phrasal verbs

Replace phrasal/compound verbs with simpler verbs when possible.

| Do                                      | Don't                                           |
| --------------------------------------- | ----------------------------------------------- |
| This document uses the following terms: | This document makes use of the following terms: |

**Exceptions:** _set up_, _log in_, _sign in_ (no better simple alternative).

### Use modifiers appropriately

- Don't use more than two nouns as modifiers of another noun.

| Do                                                        | Don't                                    |
| --------------------------------------------------------- | ---------------------------------------- |
| A cloud-native DevSecOps pipeline in a hybrid environment | A hybrid cloud-native DevSecOps pipeline |

- Place modifiers (especially _only_) immediately before the word/phrase they
  modify.

| Do                                                        | Don't                   |
| --------------------------------------------------------- | ----------------------- |
| Request only one token. / Request no more than one token. | Only request one token. |

### Active voice and present tense

- Use present tense; avoid complex/uncommon verb forms.
- Use active voice (subject + verb + object). Passive voice obscures who should
  act.

### Words in their primary sense

- Don't use the same word to mean different things. Avoid using a word as both
  noun and verb in close proximity.
- Avoid directional language (_above_, _below_) in procedural docs.

### Helper words and optional words

- Use qualifying nouns for technical keywords: _the `example.yaml` file_, not
  just _`example.yaml`_.
- Repeat words when redundancy improves comprehension:

| Do                                                                                                 | Don't                                                                                  |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| If the VM has started and if you're able to connect...                                             | If the VM has started and you're able to connect...                                    |
| ...creates both IAM segmentation and network segmentation...                                       | ...creates both IAM and network segmentation...                                        |
| An egress rule whose action is `allow`, whose destination is `0.0.0.0/0`, and whose priority is... | An egress rule whose action is `allow`, destination is `0.0.0.0/0`, and priority is... |

- Use helper words (_then_, _that_, _of_):

| Do                                                                     | Don't                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| If the attribute key is not found, then the default value is returned. | If the attribute key is not found, the default value is returned. |
| ...assumes that you have the following knowledge:                      | ...assumes you have the following knowledge:                      |
| Identify all of the datasets.                                          | Identify all the datasets.                                        |
| Start the profiler, and then run the app.                              | Start the profiler, then run the app.                             |

- Don't omit relative pronouns (_that_, _which_):

| Do                                            | Don't                                    |
| --------------------------------------------- | ---------------------------------------- |
| Update the rules that you previously defined. | Update the rules you previously defined. |

### Abbreviations and pronouns

- Define abbreviations on first use. They don't translate well.
- Clarify ambiguous pronoun antecedents—replace pronouns with the appropriate
  noun when ambiguous.

| Do                                                                                 | Don't                                                                         |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| If you use the term _green beer_ in an ad, then make sure that the ad is targeted. | If you use the term _green beer_ in an ad, then make sure that it's targeted. |

### Apostrophes

- Don't form plurals with _'s_.
- Don't use plural or possessive forms with trademarks of
  company/product/feature names.
- Don't use uncommon contractions.

## Address users directly

- Use _you_ instead of _the user_ or _they_ (unless referring to someone who
  uses the software the reader is developing).
- Provide context; don't assume prior knowledge.
- Avoid negative constructions when possible—tell readers what they _can_ do,
  not what they can't.

## Be consistent

### Consistent terminology

- Use the same term (same capitalization) for the same concept everywhere.
  Different names for the same thing cause translators to use different
  translations, increasing cost (especially with translation memory / machine
  translation).

### Standard sentence structure and formatting

- Use standardized phrases for common tasks (introducing links, output, code
  samples).
- Use standard English word order: subject + verb + object.
- Keep main subject and verb near the beginning of the sentence.
- Put conditional clauses first (circumstance before instruction).
- Make list items parallel in structure, capitalization, and punctuation.

### Consistent text formatting

- Use bold and italics consistently; don't switch between italics and
  underlining for emphasis.
- Use consistent capitalization.

## Be inclusive (global audience)

- Write dates and times unambiguously.
- Don't reference specific holidays, cultural practices, or sports unless known
  worldwide.
- Use a diverse set of example names.
- Avoid colloquialisms, idioms, slang (_ballpark figure_, _back burner_, _hang
  in there_).
- Avoid humor (hard to translate, often culturally specific).
- Avoid geographically specific references like seasons (August ≠ summer in
  southern hemisphere).

## Images for translation

- Use screenshots and text in figures sparingly—images don't get translated.
- Convey new information through text, not figures/images.
