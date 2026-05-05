---
name: google-developer-style-guide
description: >-
  Index of skills derived from the Google developer documentation style guide.
  Provides machine-optimized reference rules for writing and reviewing technical
  documentation targeting software developers.
---

# Google developer documentation style guide

Dense, machine-optimized reference skills condensed from the
[Google developer documentation style guide](https://developers.google.com/style).

## Sub-skills

| Skill                                                  | Description                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `google-developer-style-guide-voice-tone`              | Voice and tone rules: conversational tone, active voice, second person, politeness, and restrictions on pre-announcing features.               |
| `google-developer-style-guide-grammar`                 | Grammar rules: articles (a/an/the), pronouns, present tense, contractions, and sentence structure.                                             |
| `google-developer-style-guide-punctuation`             | Punctuation rules: commas, colons, semicolons, dashes, hyphens, periods, ellipses, slashes, apostrophes, and quotation marks.                  |
| `google-developer-style-guide-formatting`              | Formatting rules: text formatting, code in text, code samples, UI elements, HTML formatting, filenames, placeholders, and command-line syntax. |
| `google-developer-style-guide-structure`               | Document structure rules: headings, lists, tables, procedures, notices, cross-references, examples, and prescriptive documentation.            |
| `google-developer-style-guide-numbers-dates`           | Number and date formatting: numbers, dates, times, phone numbers, and units of measurement.                                                    |
| `google-developer-style-guide-naming-terminology`      | Naming and terminology: capitalization, abbreviations, spelling, and jargon.                                                                   |
| `google-developer-style-guide-word-list`               | Word list of recommended/non-recommended terms with alternatives. Full data in `word-list.json` for programmatic lookup.                       |
| `google-developer-style-guide-images-media`            | Image and media rules: alt text, image quality, screenshots, diagrams, and figure formatting.                                                  |
| `google-developer-style-guide-accessibility-inclusion` | Accessibility and inclusion: accessible documentation, inclusive language, and writing for a global audience.                                  |
| `google-developer-style-guide-api-code-reference`      | API reference documentation: code comments, class/method documentation, parameter descriptions, and API reference formatting.                  |

## Usage

These skills are designed for AI agents writing or reviewing technical
documentation. Reference the appropriate sub-skill by topic. For term-level
lookups, query `word-list.json` with `jq`:

```bash
# Find guidance for a specific term
jq '.[] | select(.term == "click")' skills/google-developer-style-guide-word-list/word-list.json

# List all "not recommended" terms
jq '[.[] | select(.recommendation == "not recommended")] | length' skills/google-developer-style-guide-word-list/word-list.json
```
