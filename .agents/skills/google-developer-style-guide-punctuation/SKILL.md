---
name: google-developer-style-guide-punctuation
description: >-
  Punctuation rules from the Google developer documentation style guide. Covers
  commas, colons, semicolons, dashes, hyphens, periods, ellipses, slashes,
  apostrophes, and quotation marks.
---

# Google developer documentation style guide—punctuation reference

## Commas

### Serial (Oxford) comma

Always use a comma before the final _and_ / _or_ in a series of three or more
items.

| Do                                | Don't                            |
| --------------------------------- | -------------------------------- |
| zones, regions, and multi-regions | zones, regions and multi-regions |

### After introductory words/phrases

Place a comma after an introductory word or phrase.

- ✅ _Finally, only groups that contain parameters appear in this list._
- ✅ _Based on the requirements of your game, you can implement this method._

### Two independent clauses joined by a coordinating conjunction

Insert a comma before the conjunction (_and, but, or, nor, for, so, yet_)—
unless both clauses are very short.

| Do                                                                    | Don't                                                                |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| The libraries make feed creation easier, and they ensure valid feeds. | The libraries make feed creation easier and they ensure valid feeds. |
| Type your ID and click **OK**.                                        | Type your ID, and click **OK**.                                      |

### Independent + dependent clause

Add a comma **only if** the sentence could be misread without one.

| Do                                                                                           | Don't                                                                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Direct-access flags are plain variables and can be read directly.                            | Direct-access flags are plain variables, and can be read directly.                          |
| The manager acknowledged the last team member who entered the room, and started the meeting. | The manager acknowledged the last team member who entered the room and started the meeting. |

### Nonrestrictive clauses

- Put a comma before _which_ at the start of a nonrestrictive clause.
- Put a semicolon/period/dash **before** a conjunctive adverb (_otherwise,
  however, therefore_) and a comma **after** it.
- Don't put a comma before _because_ unless it starts a nonrestrictive clause.

| Do                                                                                  | Don't                                                                              |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Name of the group, which has a maximum length of 200 characters.                    | Name of the group which has a maximum length of 200 characters.                    |
| The variable must have a value; otherwise, the server returns an error.             | The variable must have a value otherwise the server returns an error.              |
| ...backend services and backend buckets, because each set of keys is independent... | ...backend services and backend buckets because each set of keys is independent... |

---

## Colons

### Before a list

The text preceding a colon **must be a complete sentence**.

| Do                                 | Don't           |
| ---------------------------------- | --------------- |
| The fields are defined as follows: | The fields are: |

### Within sentences

Lowercase the first word after a colon (exceptions: see capitalization rules).

- ✅ _Tone: concise, conversational, friendly, respectful_
- ✅ _...remember to take these steps: review the style guide, use checklists,
  enlist a fellow writer..._

### Colons instead of dashes in description lists

Use a colon or period (not em dash, en dash, or hyphen) to separate an item from
its description.

| Do                            | Don't                         |
| ----------------------------- | ----------------------------- |
| Example: This is an example.  | Example - This is an example. |
| Appendix A: My first appendix | Appendix A—My first appendix  |

---

## Semicolons

Avoid semicolons when possible. Acceptable uses:

1. **Joining two closely related independent clauses** where a period or comma
   is less effective.
   - ✅ _You can easily test compatibility by computing the centroid; if it is
     on the opposite side of the planet, reverse the order._
2. **Before a conjunctive adverb** (_therefore, that is_) joining two
   independent clauses.
   - ✅ _...places the head-tracked node below the Main Camera; therefore, only
     the stereo cameras are affected._
   - ✅ _The URL from which a video ad loads; that is, the URL to use to fetch
     that video ad._
3. **Separating long/complex series items** that contain their own punctuation.
   - ✅ _...focus on: what matters most to your users; what is most important to
     fix; and what is easy or feasible to fix._
   - ✅ _...checking for the following: present tense and active voice; typos,
     punctuation, and grammar; and whether you can shorten anything._

---

## Dashes (em dash)

Use an em dash (—) for a break or interruption in a sentence. **No spaces**
before or after.

- Input methods: HTML `&mdash;` · macOS `Option+Shift+hyphen` · Windows
  `Alt+0151` (numpad)

### En dashes—don't use

Use a hyphen or the word _to_ instead. Never substitute an en dash for an em
dash.

### Colons instead of dashes

In description lists, use a colon—not a dash—to separate item from description
(see Colons section).

---

## Hyphens

Use a hyphen (`-`) when needed for clarity—to avoid misreadings or to combine
terms read as a unit.

### Resolution order for uncertain hyphenation

1. Established convention in your documentation set
2. Google style guide word list
3. Merriam-Webster dictionary

### Prefixes

**General rule:** No hyphen between prefix and main noun (_infrastructure,
megabyte, metadata, preprocessing_).

**Exceptions—add a hyphen when:**

| Condition                            | Examples                                  |
| ------------------------------------ | ----------------------------------------- |
| Prefix is _self_ or _cross_          | _self-managing_, _cross-region_           |
| Noun is capitalized or a number      | _non-Google_, _post-2000_                 |
| Avoids confusion / hard to read      | _de-energize_, _re-mark_, _re-sign_       |
| Base term already has hyphens/spaces | _un-Google-like_, _non-twentieth-century_ |
| Consistency within a document        | _pre-processing_, _post-processing_       |

**The _non_ prefix:** Follows general rules, but hyphenate when the closed form
is hard to parse. Use judgment; be consistent.

- Closed OK: _noncurrent, nonempty, noninteractive, nonpublic_
- Hyphenated: _non-existence, non-integer, non-key, non-managed, non-negative_
- Before hyphenated compounds: _non-KSA-based, non-self-sustaining_

### Compound nouns

Prefer **closed** (one-word) form: _webpage, hostname, tradeoff, workaround_.

Exception: Check word list for established hyphenated/open forms
(_multi-region_, _style sheet_).

When units of measurement are multiplied: hyphenate (_5 vCPU-hours, 40
person-hours_).

### Compound modifiers before a noun

Hyphenate for clarity.

| Do                                               | Don't / Notes                                              |
| ------------------------------------------------ | ---------------------------------------------------------- |
| a well-designed app                              | —                                                          |
| Android-specific techniques                      | —                                                          |
| Edge locations with more-reliable internet links | Hyphenate after _more/most_ if needed for clarity          |
| cross-data-center replication                    | Avoid 3+ word compounds; move words after noun if possible |

**Numbers + spelled-out units before a noun:** Hyphenate.

- ✅ _a 64-bit system_, _100,000-byte files_, _a five-minute wait_

**Abbreviated units:** Don't hyphenate; use `&nbsp;` between number and unit.

- ✅ `200&nbsp;GB disk`, `50&nbsp;Mbps connection`

**Adverbs ending in _-ly_:** Don't hyphenate.

| Do                                 | Don't                              |
| ---------------------------------- | ---------------------------------- |
| Publicly available implementations | Publicly-available implementations |

**Conventionally unhyphenated compounds:** Follow word list / documentation
convention.

- ✅ _A managed instance group_, _A machine learning model_

### Compound terms after a verb

Generally **no hyphen** after a verb.

- ✅ _The app is well designed._
- ✅ _The logs are written in real time._
- ✅ _Customers can use the utility as is._

**Exception:** Some compounds are always hyphenated (check word list /
Merriam-Webster).

- ✅ _You can deploy the app on-premises._
- ✅ _The utility works with apps that are cloud-based and cloud-adjacent._
- ✅ _The app is designed to be user-friendly._

### Number ranges

Use a hyphen (not en dash) for ranges. Don't mix hyphens with words.

| Do                 | Don't           |
| ------------------ | --------------- |
| 8-20 files         | —               |
| from 8 to 20 files | from 8-20 files |

### Spaces around hyphens

Never space either side—except suspended hyphens (space after, not before).

### Suspended hyphens

When compound modifiers share a common base, keep hyphens but omit the base
except on the last.

- ✅ _one- or two-hour intervals_
- ✅ _one-, two-, or three-hour intervals_

---

## Periods

### Sentences

Always end complete sentences with a period (except questions, and certain list
items/headings).

### With lists

See the Lists section in the `google-developer-style-guide-structure` skill for
rules on end punctuation in list items.

### With URLs

Avoid placing a URL at the end of a sentence. If unavoidable, no space between
URL's last character and the period. Techniques:

- Rewrite so URL isn't sentence-final.
- Place URL on its own line, omitting the period.

| Do                                                | Don't                                             |
| ------------------------------------------------- | ------------------------------------------------- |
| ...Privacy Policy:<br>http://example.com/privacy/ | ...Privacy Policy at http://example.com/privacy/. |

### With quotation marks

Period goes **inside** quotation marks—unless quoting a keyword/literal string
(see Quotation marks section).

- ✅ _...you might say "Fixed typo."_
- If quoted material ends with `?` or `!`, omit the period: _Children always ask
  "Why?"_

### With parentheses

| Scenario                                           | Rule                             |
| -------------------------------------------------- | -------------------------------- |
| Parenthetical at end of sentence                   | Period **after** closing paren.  |
| Parentheses enclose a complete standalone sentence | Period **inside** closing paren. |

- ✅ _...(even if that change occurs while your application isn't running)._
- ✅ _(With App Engine, there are no servers for you to maintain.)_

### Headings

Don't end headings with periods.

### Numbers

Use a period for decimal points (not a comma).

### Abbreviations

Period after shortened words; no periods in acronyms/initialisms.

### Sentence spacing

One space between sentences.

### Exclamation points

General rule: **avoid**.

| Content type           | Guidance                                                                 |
| ---------------------- | ------------------------------------------------------------------------ |
| Concept/reference docs | Never                                                                    |
| Procedural topics      | Avoid; use periods                                                       |
| Blog posts             | Acceptable sparingly for enthusiasm                                      |
| Code examples          | OK when required by syntax (e.g., `!=`)                                  |
| System literals        | OK when part of exact error code/message                                 |
| Tutorials              | Sparingly for milestones: _Congratulations! You've completed the setup._ |

---

## Ellipses

**General rule:** Don't use ellipses in documentation.

### Don't use as suspension points

- ❌ _The answer is ... wait for it ... that you shouldn't do this._

### In UI references

Omit ellipses from UI element names unless omission causes confusion. _Save ..._
→ document as _click **Save**_.

### In text

Don't use in original text. Acceptable **only** in quoted text to replace
omitted portions—but **never** at the beginning or end of the quote.

| Do                                                                        | Don't                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| "All the world's a stage, .... And one man in his time plays many parts." | "All the world's a stage, And all the men and women merely players ...." |
| —                                                                         | " ... all the men and women merely players."                             |

**Four dots:** When omitted material spans a sentence boundary, use four periods
(the fourth is the sentence-ending period).

### Formatting

- Use three actual periods (`...`), not the ellipsis character (`…`).
- One space before and after—unless a punctuation mark immediately follows (then
  no space after).

| Do                                     | Don't                               |
| -------------------------------------- | ----------------------------------- |
| ...code in there ... we'll explain...  | ...code in there...we'll explain... |
| ...code in there ...; we'll explain... | —                                   |

---

## Slashes

**General rule:** Avoid slashes except in code, file paths, and URLs.

### Dates

Don't use slash-based date formats.

### Alternatives

Don't use slashes to separate alternatives; spell out _and_ / _or_.

| Do                                  | Don't                       |
| ----------------------------------- | --------------------------- |
| ...developed and is hosted by...    | ...developed/hosted by...   |
| Call this method five or six times. | Call this method 5/6 times. |

### _And/or_

Often _and_ implies _or_. Avoid _and/or_ except where space is limited (e.g.,
tables).

| Do                                        | Don't                                   |
| ----------------------------------------- | --------------------------------------- |
| You can view and edit your own data.      | You can view and/or edit your own data. |
| ...raw events, processed events, or both. | ...raw and/or processed events.         |

### File paths and URLs

Forward slashes are fine in paths/URLs. Break long URLs **immediately after a
slash**; never insert a hyphen.

### Fractions

Don't use slashes (ambiguous). Use fraction characters, decimals, or
percentages.

| Do             | Don't |
| -------------- | ----- |
| ¾ / 0.75 / 75% | 3/4   |

### Abbreviations

Don't use slash-based abbreviations; spell out.

| Do            | Don't   |
| ------------- | ------- |
| care of, with | c/o, w/ |

---

## Apostrophes and possessives

### Straight apostrophes

Always use **straight** apostrophes (`'`), not curly/typographic (`’`).

### Forming possessives

| Noun type                          | Rule         | Example                                             |
| ---------------------------------- | ------------ | --------------------------------------------------- |
| Singular (including ending in _s_) | Add _'s_     | _each vector's record_, _the storage class's quota_ |
| Plural ending in _s_               | Add only `'` | _the models' capabilities_                          |
| Plural not ending in _s_           | Add _'s_     | (standard English rule)                             |

If a possessive is awkward, rewrite.

| Do                            | Don't                                        |
| ----------------------------- | -------------------------------------------- |
| Analyze the business data.    | Analyze the businesses' data.                |
| The rule that the FTC issued. | The Federal Trade Commission's (FTC's) rule. |

### Don't use _'s_ to form plurals

### Product, feature, and trademark names

Don't form possessives from product/feature names or trademarks when describing
function/performance. Use the name as a modifier or rewrite with _of_.

| Do                                           | Don't                                   |
| -------------------------------------------- | --------------------------------------- |
| ...monitor Google Search performance.        | ...monitor Google Search's performance. |
| ...monitor the performance of Google Search. | —                                       |

Company name possessives are OK for non-trademark uses: _Google's new office is
nearby._

### Code items

Never form a possessive from a code item. Possessive goes on the following noun,
or rewrite.

| Do                                           | Don't                      |
| -------------------------------------------- | -------------------------- |
| the `wordCount` method's return value        | `wordCount`'s return value |
| the value returned by the `wordCount` method | —                          |

---

## Quotation marks

### Use straight double quotation marks

Always use straight (`""`), not curly/typographic (`“”`), in developer
documentation.

**Reasons:** Code requires straight marks; auto-curling tools and humans make
mistakes; hard to proofread; difficult to type on some platforms.

### When to use quotation marks

| Use case                                                  | Example                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| Title of shorter work (article, episode) not linked       | ...described in the section "Deploying containers" of the video. |
| Title of parent doc when linking to a subsection          | The [ML workflow section](...) of "Introduction to Vertex AI"... |
| Direct quotation / slogan                                 | Martin Fowler has said, "We are still learning..."               |
| Metaphorical use of a term (not established domain usage) | This forms an "island" within the network.                       |

Full-length work titles: use _italics_, not quotation marks.

### Commas and periods with quotation marks

Commas and periods go **inside** quotation marks.

| Do                                                    | Don't                                                 |
| ----------------------------------------------------- | ----------------------------------------------------- |
| See the section titled "Care and feeding of the emu." | See the section titled "Care and feeding of the emu". |

**Exception—literal/keyword strings:** Put punctuation **outside** quotation
marks to preserve the exact literal.

| Do                                          | Don't                                       |
| ------------------------------------------- | ------------------------------------------- |
| If you enter "escape", the program crashes. | If you enter "escape," the program crashes. |

Prefer code font over quotation marks for literals: _If you enter `escape`, the
program crashes._

### Single quotation marks

Use **only** for:

1. Code examples in languages that use single quotes.
2. Nested quotations (single inside double).

| Do                                                   | Don't                                                |
| ---------------------------------------------------- | ---------------------------------------------------- |
| She said, "I heard him shout 'Help,' and saw him..." | She said, 'I heard him shout "Help", and saw him...' |
