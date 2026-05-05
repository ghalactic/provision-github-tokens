---
name: google-developer-style-guide-word-list
description: >-
  Word list from the Google developer documentation style guide. Contains
  recommended and non-recommended terms with alternatives. The full word list is
  in word-list.json alongside this file.
---

# Google developer documentation style guide—word list

This skill provides the word list from the
[Google developer documentation style guide](https://developers.google.com/style/word-list),
structured as machine-readable JSON for use in documentation review and
authoring.

## Word list structure

The file `word-list.json` (alongside this file) is a JSON array of objects. Each
object has the following fields:

| Field            | Type             | Description                                                                |
| ---------------- | ---------------- | -------------------------------------------------------------------------- |
| `term`           | string           | The word or phrase.                                                        |
| `recommendation` | string           | One of `"recommended"`, `"not recommended"`, or `"use with care"`.         |
| `details`        | string           | Explanation and guidance from the style guide.                             |
| `use_instead`    | string or `null` | The preferred alternative, when the term is not recommended or needs care. |

## Usage examples

Look up a specific term:

```sh
jq '.[] | select(.term | test("abort"; "i"))' word-list.json
```

List all terms that are not recommended:

```sh
jq '[.[] | select(.recommendation == "not recommended")] | length' word-list.json
```

Find alternatives for a term:

```sh
jq '.[] | select(.term | test("blacklist"; "i")) | {term, use_instead, details}' word-list.json
```

## Summary

The word list contains **597 entries** across the following recommendation
categories:

- **Recommended** (358)—Terms that are approved for use.
- **Not recommended** (147)—Terms to avoid, usually with suggested alternatives.
- **Use with care** (92)—Terms that are acceptable in specific contexts but
  should be used carefully.
