---
name: google-developer-style-guide-structure
description: >-
  Document structure rules from the Google developer documentation style guide.
  Covers headings, lists, tables, procedures, notices, cross-references,
  examples, and prescriptive documentation.
---

# Headings and titles

## Casing and style

- **Sentence case** for all headings and titles.
- Keep headings **unique** within a page for navigation.
- Use a **unique `h1`** per page; only one `h1` per page.
- Don't repeat the exact page title in a section heading.

## Heading text phrasing

| Context                       | Style                                           | Example (Do)                     | Example (Don't)                   |
| ----------------------------- | ----------------------------------------------- | -------------------------------- | --------------------------------- |
| Task-based heading            | Start with **bare infinitive** (base-form verb) | `Create an instance`             | `Creating an instance`            |
| Conceptual / non-task heading | **Noun phrase**, not starting with -ing verb    | `Migration to Google Cloud`      | `Migrating to Google Cloud`       |
| Optional section              | Prefix with `Optional:`                         | `Optional: Customize your alias` | `Customize your alias (optional)` |

- Mixed heading styles (task + conceptual) in one doc are OK—use appropriate
  phrasing per section.
- **Avoid `-ing` verb forms** as the first word of any heading. Exception: when
  no better alternative exists (e.g., _Billing_, _Pricing_). `-ing` later in a
  heading is fine (e.g., _Introduction to BigQuery monitoring_).

## Heading format rules

### Syntax and capitalization

- **Sentence case** always.
- Keep punctuation simple—complex punctuation suggests the heading is too
  complicated.
- Only abbreviate in headings if the abbreviation is more commonly known. Define
  it in the first paragraph. Use the more prominent term form for SEO.

### Formatting and code

- **Don't use numbers** in headings to indicate section sequence.
- **Avoid code items** in headings. If unavoidable, add a descriptive noun to
  the code-font item.
- **Don't put links** in headings.

### Hierarchy and structure

- Use heading tags for semantic structure (`h1`→`h2`→`h3`), not for visual
  formatting.
- **Don't skip heading levels** (e.g., no `h3` directly under `h1`).
- **Don't use empty headings**—every heading must be followed by content.

Do:

```markdown
## Migrate VMs to Compute Engine

Migration is not just a single step. The following sections describe the
recommended steps.

### Design the migration
```

Don't:

```markdown
## Migrate VMs to Compute Engine

### Design the migration
```

## Referring to sub-sections

Use **"the following sections"** to introduce a group of related sub-sections.
Don't use "this section" or "these sections" (ambiguous).

---

## Lists

### List vs. table decision

| Item structure                           | Presentation                         |
| ---------------------------------------- | ------------------------------------ |
| Single unit per item                     | Numbered, lettered, or bulleted list |
| Pair of related data (term + definition) | Description list (or table)          |
| ≥ 3 pieces of related data per item      | Table                                |

- Don't use a list for a single item.

### List types

| Type                          | Use for                                      | HTML             |
| ----------------------------- | -------------------------------------------- | ---------------- |
| **Numbered**                  | Sequence matters (steps, phases, priorities) | `ol`, `li`       |
| **Bulleted**                  | No sequence; set of options/examples         | `ul`, `li`       |
| **Description**               | Term + description/definition pairs          | `dl`, `dt`, `dd` |
| **Run-in heading** (bulleted) | Bold term + inline description; saves space  | `ul`, `li`       |

- Nested sequential sub-lists: lowercase letters → lowercase Roman numerals.

### Introductory sentences

- Precede a list with a **complete introductory sentence** (not a partial
  sentence completed by list items).
- End with colon (if immediately before list) or period (if intervening
  material).
- OK to omit intro sentence if the heading provides sufficient context.
- Use _the following_ as a noun phrase.

Do:

```
Use the **Submit** button for any of the following purposes:
- To submit the form.
- To indicate that you're done.
```

Don't:

```
Use the **Submit** button to:
- Submit the form.
- Indicate that you're done.
```

- An objectives list under an `#### Objectives` heading needs no intro sentence.

### Multiple paragraph list items

- Use `<p>` elements, not `<br>`, for multiple paragraphs within a list item.

### Parallel syntax

- Use the same grammatical structure for all items in a given list.

### Capitalization and end punctuation

#### Numbered, lettered, and bulleted lists

- **Start** each item with a capital letter (unless case is meaningful, e.g.,
  glossary terms).
- **End** each item with a period or appropriate punctuation, **except**:
  - Single word → no end punctuation.
  - No verb in the item → no end punctuation.
  - Entirely code font → no end punctuation.
  - Entirely link text or document title → no end punctuation.
- If punctuation becomes inconsistent, rewrite for parallel construction or add
  periods to all items.

#### Description lists (`dl`)

- Start each `dt` (term) with a capital letter. Don't end the term with a
  period.
- End each `dd` (description) with a period.

#### Run-in heading lists

- Start run-in heading with a capital letter.
- End run-in heading with a **period** or **colon** (be consistent within the
  list).
- After a period → capitalize first letter of description; end description with
  a period.
- After a colon → lowercase first letter of description.
  - If description is a short phrase without a verb → no period.
  - If description includes a verb or standalone thought → end with a period.
- Don't use a dash to separate term from description.

Do:

```
- **Big**: a short word
- **Relevant**: a fancy word
```

Do:

```
- **It increases fuel economy by reducing baggage weight**. By charging astronomical prices...
```

### Unusual list numbering

- Reverse order: `<ol reversed>`.
- Manual value: `value` attribute (avoid in most cases).

### Comma-separated (inline) lists

- Use serial commas.
- Don't end with _etc._ or _and so on_; instead introduce the list as
  non-exhaustive.

Do:
`The service processes data like event logs, clickstream data, social network interactions, and e-commerce transactions.`

Don't:
`The service processes event logs, clickstream data, social network interactions, e-commerce transactions, etc.`

---

## Tables

### When to use tables

- Use tables for items with **≥ 3 pieces of related data** per item.
- Use lists for single-unit items or term/definition pairs.

#### Don't use tables for

- Page layout (use CSS).
- A single row (usually; reference docs may be exceptions).
- A single column (use a list instead).
- Code snippet layout.
- Long one-dimensional lists split into columns.
- In the middle of a numbered procedure.

### Multi-paragraph table cells

- Use `<p>` elements, not `<br>`.

### Introductory sentences

- Introduce every table with a **complete sentence** describing its purpose
  (screen readers don't pre-announce tables).
- End with colon (if immediately before table) or period (if intervening
  material).

Do:
`Change the environment variables to values for your deployment, as listed in the following table:`

### Table placement

- Refer to position with phrases like _the following table_ or _the preceding
  table_.
- Don't put a table in the middle of a sentence.
- Place footnotes immediately after the table; avoid footnotes when possible.

### Table captions

- **One table in doc**: no caption needed (place adjacent to referring text).
- **Multiple tables**: use `<caption>` as first child of `<table>`. Format:
  **`Table N.`** _Description_. Sentence case, no trailing period.
- Refer by number in text (e.g., _as shown in table 2_). Don't capitalize
  _table_ unless it starts a sentence.

### Table formatting

- Don't add inline styling to `<table>`.
- Use `<th>` for header cells (not visual styling alone).
- **Don't merge cells** (`colspan`/`rowspan`).
- Sort rows logically, or alphabetically if no logical order.
- Split long/complicated tables into multiple tables.
- Don't convey information through images/symbols alone; always include `alt`
  text.

### Table column heads

- Sentence case.
- Concise.
- No end punctuation (no period, ellipsis, or colon).
- Use `<th>` for first column and first row only.
- Include `scope` attribute for accessibility.

### Responsive tables

- Use CSS that adapts to different viewport sizes.

### Linking to tables

- Prefer referring by table number over linking directly.

---

## Procedures

### Introductory sentences

- Introduce with a sentence providing context beyond the heading. Don't repeat
  the heading.
- End with colon (immediately before procedure) or period (if intervening
  material).
- Use an imperative statement or "do the following" / "follow these steps."
- Don't introduce with a partial sentence completed by steps.

Do: `To customize the buttons, follow these steps:` Do: `Customize the buttons:`
Do: `To customize the buttons, do the following:` Don't:
`To customize the buttons:`

### Single-step procedures

- Format as a **bulleted list item** (not a numbered step).

Do:

```
* To clear the entire log, click **Clear logcat**.
```

Don't:

```
1. Click **Clear logcat**.
```

### Sub-steps

- Sub-steps: lowercase letters.
- Sub-sub-steps: lowercase Roman numerals.
- End the parent step with a colon or period (treat as intro sentence).

### Order within a complex step

1. Action description
2. Command (if needed)
3. Placeholder explanation
4. Command explanation (if needed)
5. Command output (if needed)
6. Result explanation (separate paragraph)

### Multi-action steps

- One action per step (general rule).
- OK to combine sequential menu clicks with `>`:
  `Click **File > New > Document**.`
- Split steps that feel too long.

### Multiple procedures for same task

- Document **one** procedure (most accessible, shortest, simplest).
- If multiple ways are needed, separate into different pages, headings, or tabs.
- Prefer: keyboard-accessible, shortest, most familiar language.

### Repetitive procedures

- Don't repeat procedures; reference and link to them.

### Optional steps

Do: `1. Optional: Type an arbitrary string...` Don't:
`1. (Optional) Type an arbitrary string...`

### Location before action

- State **where** before **what**.

Do: `In Google Docs, click **File > New > Document**.` Don't:
`Click **File > New > Document** in Google Docs.`

- Restate location context in each procedure section if split across headings.

### Goal before action

- State the **purpose** before the **action**.

Do: `To start a new document, click **File > New > Document**.` Don't:
`Click **File > New > Document** to start a new document.`

- If "To ..." phrasing makes a required step sound optional, use colon format:
  `Sort the data by date: click **Column > Sort**.`

### Results and justifications

- State action first, result second, in the same paragraph.
- Avoid repeating UI element names across consecutive steps.

Do:

```
1. Click **Enter**.
2. In the **New file** dialog that appears, click **Next**.
```

Don't:

```
1. Click **Enter**. The **New file** dialog appears.
2. In the **New file** dialog, click **Next**.
```

- Justifications: action first, justification second. E.g.,
  `Store the private key in a secure location. You need it later.`

### Summary of procedure guidelines

| Rule                                   | Do                                                             | Don't                                                                   |
| -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| First sentence = imperative verb       | `Clone the repository...`                                      | `You need the project ID later... Retrieve the project ID.`             |
| Complete sentences, parallel structure | `Download the key... Click **More**, then click **Download**.` | `Download the key by clicking **More** and then clicking **Download**.` |
| Optional prefix                        | `Optional: Type...`                                            | `(Optional) Type...`                                                    |
| Location before action                 | `In the console, go to **BigQuery**.`                          | `Go to **BigQuery** in the console.`                                    |
| Goal before action                     | `To start a doc, click **File > New**.`                        | `Click **File > New** to start a doc.`                                  |
| No directional language                | `Click **Menu**.` / `In the following diagram,...`             | `Click the button with three lines.` / `In the above diagram,...`       |
| No "please"                            | `To open a doc, click **File > Open**.`                        | `To open a doc, please click **File > Open**.`                          |
| Focus on what the command does         | `Deploy the load generator:`                                   | `Run the following command:`                                            |
| Enter as part of step                  | `Click search, type X, then press **Enter**.`                  | Two separate steps for type + Enter                                     |
| No keyboard shortcuts                  | `Copy the command, then paste it...`                           | `Press Ctrl+C, then Ctrl+V...`                                          |
| Prerequisites upfront                  | `The following hardware and software are required:...`         | —                                                                       |
| Minimal steps                          | Keep steps focused; one decision per step.                     | —                                                                       |

---

## Notices (notes, cautions, warnings)

### Notice types

| Type        | Severity | Use for                                                                                     |
| ----------- | -------- | ------------------------------------------------------------------------------------------- |
| **Note**    | Low      | Ordinary aside or tip; useful but not critical. Reader still succeeds if skipped.           |
| **Caution** | Medium   | Proceed carefully; warns about risky configurations.                                        |
| **Warning** | High     | "Don't do this" or irreversible action (data loss, security breach, monetary loss).         |
| **Success** | N/A      | Successful action confirmation. **Interactive/dynamic content only**; not for static pages. |

### General rules

- Don't overuse notices; they lose visual distinctiveness.
- Avoid grouping two or more notices together; reorganize content instead.
- If unsure whether something should be a notice, write it as regular text
  first.

### When to use a note

All must be true:

- Information is **relevant but not necessary** to succeed.
- Interruption is **not an obstacle** (doesn't lead reader down a different
  path).
- Information is **not in the flow** of the text.

### When NOT to use a note

- Don't use for cross-references.
- Don't use for prerequisites or prior steps.
- Don't make a full procedural step into a note.
- Don't use for information necessary for reader success.
- Don't use for information that's in-flow with preceding text (expected
  results, continuations).

### HTML example

```html
<aside class="note">
  <b>Note:</b> All VPC networks include firewall rules.
</aside>
```

---

## Cross-references and linking

### Selective linking

- Each link adds cognitive load and a chance to leave the page.
- Provide help in context when possible (define terms, explain concepts, give
  brief steps) instead of linking.
- **No duplicate links** to the same destination on a page, unless:
  - Linking to different sections of the target page.
  - Page is very long and links are far apart.
  - Multiple entry points exist (e.g., procedure section + troubleshooting
    section).
- Link to the **most relevant** page and heading. Avoid multiple links that
  serve the same purpose.
- OK to link to third-party sites for standards/software rather than
  re-documenting them.

### Descriptive link text

- Use **short, unique, descriptive phrases** as link text.
- Two options:
  1. **Exact page title / heading** as link text.
  2. **Descriptive phrase**, capitalized as part of the sentence.
- Place important words at the beginning of link text.
- Don't reuse the same link text for different targets in one document.
- Keep link text short (not a sentence or paragraph).

Do: `For more information, see [Load balancing and scaling](...).` Don't:
`See [this blog post](...).`

#### Avoid vague link text

Don't: _this document_, _this article_, _click here_.

Do: `see [Make headings into link targets](...)` Don't:
`Want more? [Click here!](...)`

#### Avoid URLs as link text

Use page title or description instead. **Exception**: some legal documents
(e.g., Terms of Service).

#### Abbreviations in link text

Include long form and abbreviation together inside the link.

Do: `[Google Kubernetes Engine (GKE)](...)` Don't:
`[Google Kubernetes Engine](...) (GKE)`

#### Link to commands

Include the description with the code element in the link text.

Do: `the [--hostname flag](...)` Don't: `the [--hostname](...) flag`

### Link introductions

- Standard phrasing: **"For more information, see ..."** or **"For more
  information about ..., see ..."**
- Use "about" clause when link text doesn't clearly indicate why you're linking.
- Use _see_ (not other verbs). Don't use _on_ instead of _about_.

### Clarify link purpose

- Make surrounding context or link text clearly indicate **why** you're linking.
- Add an "about..." phrase if needed.

### Unexpected link behavior

- **File downloads / email links**: state in link text; mention file type. E.g.,
  `download the security features PDF`.
- **Same-page links**: signal with "section of this document."
- **Other-page section links**: if heading title is identical to one on source
  page, add context (e.g., `in "Building new audiences..."`).
- **New tab links**: don't force new tab. If you must, add
  `(opens in a new tab)` to link text.
- **Different domain**: don't use external link icons. Mention in text if
  important.

### Link formatting

- Put punctuation **outside** link tags.
- Don't put link text in quotation marks.
- Unlinked cross-references:
  - Section/short work → quotation marks: `"Describing system versions"`
  - Full-length work (book, movie) → italics: `_The Chicago Manual of Style_`

### Navigation links

- Don't link outside the documentation set from navigation (e.g., table of
  contents).
- If necessary, make it clear the reader is leaving the doc set.

### Link styling (CSS)

- Contrast link text color from regular text.
- Underline links; don't underline non-links.
- Change color for visited links (color-blind-friendly).

---

## Example domains and names

### Domains

- Use **`example.com`**, **`example.org`**, **`example.net`** (IANA-reserved).
- Google-owned doc domains: `altostrat.com`, `examplepetstore.com`,
  `example-pet-store.com`, `myownpersonaldomain.com`,
  `my-own-personal-domain.com`, `cymbalgroup.com`.
- For internationalized domain names: use
  [IDN Test TLDs](https://en.wikipedia.org/wiki/IDN_Test_TLDs).

### Email addresses

- Combine a doc domain + an approved person name: `dana@example.com`.
- Generic addresses OK: `support@example.net`.
- Don't use product names or made-up names.

### Person names

Approved given names (gender-neutral): Alex, Amal, Ariel, Bola, Charlie, Cruz,
Dana, Dani, Hao, Ira, Izumi, Jie, Kai, Kalani, Kim, Kiran, Lee, Lucian, Luka,
Mahan, Noam, Nur, Quinn, Raha, Rosario, Sasha, Tal, Taylor, Tristan, Yuri.

- **Surnames**: use an initial after the given name (e.g., `Quinn N.`,
  `Dana A.`).
- Use gender-neutral pronouns (_they/their/theirs_).
- Avoid gender binary assumptions and stereotypes in job roles.
- Don't use Alice and Bob unless the doc references a spec that uses them; if
  so, use only characters from that cast.

### Company names

- Use **Example Organization**.
- To differentiate: _Enterprise Example Organization_, _Startup Example
  Organization_.

### Phone numbers

- Use US range **`800-555-0100`** through **`800-555-0199`** (reserved for
  fiction/examples).
- Never use real phone numbers.

### IP addresses

#### IPv4 (RFC 5737)

- `192.0.2.0`–`192.0.2.255` (`192.0.2.0/24`)
- `198.51.100.0`–`198.51.100.255` (`198.51.100.0/24`)
- `203.0.113.0`–`203.0.113.255` (`203.0.113.0/24`)

#### IPv6 (RFC 3849)

- `2001:db8::` through `2001:db8:ffff:ffff:ffff:ffff:ffff:ffff`
- Range: `2001:db8::/32`

### Street addresses

Use fictional addresses:

- `1800 Amphibious Blvd., Mountain View, CA 94045`
- `Avenida da Pastelaria, 1903, Lisbon, 1229-076`
- `8 Rue du Nom Fictif, 341 Paris`

### Project names

- Use meaningful/descriptive names. Don't use `foo`, `bar`, `baz`.
- Numbering scheme when needed: `staging`, `frontend-development`,
  `production-1`.

### Service account IDs

- Use `123456789012345678901` as the example numeric ID.

---

## Prescriptive documentation

### Core principle

- **Prescriptive** (opinionated) documentation **recommends a way** to
  accomplish tasks.
- Tell the reader **what to do**, not a list of options.
- State a clear, specific purpose; headings and content serve that purpose.
- Scenarios/procedures reflect the most likely use cases.
- Commands/arguments serve the most common use case.

### Word choice for recommendations and requirements

**Avoid `should`**—it creates ambiguity (recommended but optional?).

| Situation                 | Use                                           | Example                                                                                 |
| ------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| Action is **required**    | `must` or imperative instruction              | `Do the following before you continue.`                                                 |
| Action is **recommended** | `We recommend ...` or `Google recommends ...` | OK to use `should` for generally recognized advice: `You should use a strong password.` |
| Action is **optional**    | `can`                                         | `You can also use approach B.`                                                          |
| Outcome is **expected**   | Describe directly                             | `The process returns 10 items.`                                                         |
| Outcome is **possible**   | `might` or `can`                              | `The process can take about 30 minutes.`                                                |
| State is **actual**       | Clarify who acts                              | `You must set the value to true.` / `The server sets the value to true.`                |

Don't: `The Classroom Share Button should conform to our guidelines.` Do:
`Ensure that the Classroom Share Button conforms to our guidelines.`

Don't: `The column that the filter should operate on.` Do:
`The column of the data table that the filter operates on.`

Don't: `Here's what you should do.` Do:
`Whether it's a new project or an existing one, perform the following steps.`
