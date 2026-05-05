---
name: google-developer-style-guide-numbers-dates
description: >-
  Number and date formatting rules from the Google developer documentation style
  guide. Covers numbers, dates, times, phone numbers, and units of measurement.
---

# Numbers

## Numbers as words

Spell out:

- **Zero through nine** (unless exceptions below apply).
  - ✅ `two-day total` · `four options` · `five minutes` · `nine developers`
- **Numbers starting a sentence.**
  - ✅ `Fifteen directories are created.`
  - Better: rearrange so the number appears later.
  - ✅ `In general, avoid sending files larger than 164 MB as attachments.`
  - ❌
    `164 MB is generally considered too large a file to send as an attachment.`
  - **Exception:** A four-digit year may start a sentence (non-optimal but
    acceptable).
- **A number followed by a numeral** (to avoid adjacent numerals).
  - ✅ `This procedure creates fifteen 100,000-byte files.`
  - But: ✅ `This procedure creates 15 of the 100,000-byte files.` (no adjacent
    numerals)
- **Indefinite / casual numbers.**
  - ✅ `thousands of combinations` · `a million songs`

## Numbers as numerals

Use numerals for:

- **10 and greater.**
  - ✅ `24 hours` · `18 years old` · `27 minutes` · `728 shipments` ·
    `18,000,000 users`
- **Always numerals regardless of size:**
  - Version numbers: ✅ `version 3`
  - Technical quantities (memory, disk, queries, limits): ✅
    `6 queries per second` · `50 Mbps` · `128 bits`
  - Page numbers, chapter/section numbers, step numbers.
  - Prices.
  - Numbers without units (e.g., in math expressions).
  - Numbers < 10 in the same sentence as numbers ≥ 10: ✅
    `The menu contains 15 options but 6 of them are deselected.`
- **Negative numbers.**
- **Fractions** (most; see below).
- **Percentages** (see below).
- **Dimensions** (see below).
- **Decimals** (see below).
- **Measurements:** ✅ `8 pixels`
- **Numbers in a range.**

Use a nonbreaking space between a number and its associated noun when they must
stay on the same line.

## Ordinal numbers

Always spell out ordinals in text.

- ✅ `first` · `fifth` · `twelfth` · `forty-third`
- ❌ `1st` · `5th` · `12th` · `43rd`

## Roman numerals

Avoid. Use Arabic numerals. Exception: sub-steps in numbered procedures.

## Fractions

Prefer decimal: ✅ `0.75`

If words required, hyphenate numerator–denominator unless one part is already
hyphenated:

- ✅ `one and one-half` · `two-fifths` · `five sixty-fourths`

## Percentages

Numeral + `%`, no space.

- ✅ `40%`
- **Exception:** Spell out both number and "percent" when starting a sentence.
  - ✅ `Forty percent of the files`

## Ranges of numbers

Hyphen, no spaces.

- ✅ `2012-2016`
- For ranges with units, see [Units—Ranges](#ranges-of-numbers-with-units).

## Suspended hyphens

- ✅ `one-, two-, or three-hour intervals`

## Commas and decimal points

Standard American formatting:

- Commas every three digits left of decimal for numbers ≥ 4 digits.
- Period for decimal point.
- No separators right of decimal.

| ✅ Do                     | ❌ Don't                |
| ------------------------- | ----------------------- |
| `1,532,784 bytes per day` | `1532784 bytes per day` |
| `2,000 vertices`          | `2000 vertices`         |
| `$0.031611/vCPU hour`     | `$0.031 611/vCPU hour`  |

## Decimals

- Decimals < 1: leading zero required. ✅ `0.3 inches` ❌ `.3 inches`
- Decimal numbers are grammatically plural even when ≤ 1.0. ✅ `1.0 inches`

## Dimensions

Numerals + lowercase `x`, no spaces.

- ✅ `192x192`
- ❌ `192 x 192`

## Exponents

Standard math notation; no space between base and exponent. ✅ `2³`

## Practical implications

Accompany numerical concepts with real-world meaning (e.g., link to pricing
calculator for fees).

---

# Dates and times

## Expressing times

- Use **12-hour clock** by default. Use 24-hour only when documenting features
  that use it; if used, be consistent throughout the page.
- Use exact times when possible; _noon_ and _midnight_ are acceptable.
- **AM / PM:** uppercase, one space before. ✅ `3:45 PM`
- **Round hours:** drop minutes. ✅ `3 PM`
- **Time ranges:** hyphen, no spaces. ✅ `5-10 minutes ago`

## Time zones

Avoid unless absolutely necessary. When required:

- Indicate if local: ✅ `10 AM your local time`
- Match UI timestamp format if available.
- Spell out region + parenthetical UTC/GMT offset: ✅
  `US and Canadian Pacific Standard Time (UTC-8)`
- Never abbreviate time zone names (no `PST`, `EST`, etc.).
- If event time doesn't change for DST, use specific time zone without UTC
  reference.

## Expressing dates

**Default format:** Spell out month and day of week in full; four-digit year.

- ✅ `January 19, 2017`
- With day of week: `DAY_OF_WEEK, MONTH DAY, YEAR` → ✅
  `Tuesday, April 27, 2021`

### Partial dates

- Month + year only: no comma. ✅ `She was hired in January 2017.`

### Abbreviations (space-constrained only)

Three-letter abbreviations; capitalize first letter; no period. Abbreviate all
parts or none.

- ✅ `Mon, Sep 3, 2018`
- ❌ `Mon, September 3, 2018` (mixed)
- Be consistent across similar contexts (e.g., all table cells).

### Dates mid-sentence

- `MONTH DAY, YEAR` mid-sentence: comma after year. ✅
  `The January 19, 2017, release of ...`
- Month + year only mid-sentence: no comma. ✅ `The January 2017 release of ...`

### Avoid numeric-only dates

Numeric dates are ambiguous across regions (`04/05/09` = different dates in
US/UK/other).

- ✅ `February 12, 2017` · `Sunday, February 12, 2017`
- ❌ `02.12.2017` · `12/02/2017`

### Numeric-only format (when required)

Use **ISO 8601**: `YYYY-MM-DD` with hyphens.

- ✅ `2017-04-15`
- ❌ `04/06/2017`
- Tip: Choose a day > 12 for fictional examples to avoid month/day ambiguity.

### Date + time together

Date first, then time.

- ✅ `2017-04-15 at 3 PM`
- ✅ `May 4, 2009, at 6 PM`

## Seasons / divisions of the year

Never refer to seasons (hemisphere-dependent). Use months, quarters, or
temperature.

| ✅ Do                                                                        | ❌ Don't                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| `During warmer months, data centers face a higher risk of cooling failures.` | `During summer months, ...`                      |
| `In November and December, data centers experience higher traffic volume.`   | `In winter, ...`                                 |
| `Changes are released in October of each year.`                              | `Changes are released in the Fall of each year.` |

---

# Phone numbers

## Example numbers

Use reserved range **800-555-0100** through **800-555-0199** for examples. Never
use real phone numbers.

## Formatting in HTML / Markdown

Use nonbreaking hyphens (`&#8209;`) to keep number on one line.

- HTML/Markdown: `415&#8209;555&#8209;0132` → renders as 415‑555‑0132

## North American (NANP)

Hyphen-separated: `AREA-EXCHANGE-NUMBER`

- ✅ `415‑555‑0132`

## International

`+COUNTRY‑AREA‑NUMBER`—plus sign immediately before country code (no space).

- ✅ `+1‑415‑555‑0132`

## Extensions

Word "extension" after number + comma.

- ✅ `415‑555‑0132, extension 987`

---

# Units of measurement

## Spacing

Nonbreaking space (`&nbsp;`) between number and unit.

- ✅ `64&nbsp;GB` → 64 GB · `25&nbsp;mm` → 25 mm
- ❌ `64 GB` (regular space) · `64GB` (no space)

**Exceptions—no space:**

| Category      | Example       |
| ------------- | ------------- |
| Currency      | `$10` · `£25` |
| Percent       | `65%`         |
| Angle degrees | `180°`        |

**Temperature:** nonbreaking space before degree symbol; no space between `°`
and scale letter.

- ✅ `50&nbsp;&deg;C` → 50 °C
- **Kelvin:** no degree symbol; nonbreaking space before K. ✅ `300&nbsp;K` →
  300 K

## Compound modifiers

Number + unit modifying a noun: don't hyphenate unless needed for clarity.

- ✅ `200 GB disk`
- ✅ `a 128-bit system`

## Ranges of numbers with units

Repeat the unit for each number. Use word "to" (not hyphen—avoids confusion with
minus).

- ✅ `-40 °C to 85 °C`
- ❌ `-40-85 °C`

_Unit_ = symbols (°) and abbreviations (MB), not nouns (file).

## Multiplied units

Hyphenate components.

- ✅ `5 vCPU-hours` · `40 person-hours`

## The _k_ suffix (thousands)

No space before `k`. Always add a noun for clarity (avoid confusion with
kilobytes).

- ✅ `55k download operations and 20k upload operations per day`

## Currency

Disambiguate currency with indicator before amount.

- ✅ `US$10`

US dollars: comma for thousands; period for decimal; dollar sign prefix; no
separators right of decimal.

- ✅ `$0.006653 per vCPU hour` · ❌ `$0.006,653 per vCPU hour`
- ✅ `$10,000 in fees` · ❌ `$10 000 in fees`

## Rates

Use "per" instead of `/` when space permits. `/` acceptable in tight spaces
(e.g., small table cells).

Shorten "per" to "p" only for established abbreviations.

| ✅ Do              | ❌ Don't       |
| ------------------ | -------------- |
| `requests per day` | `requests/day` |
| `Gbps`             | `Gb/s`         |
| `MBps`             | `MB/s`         |

## Decimal vs. binary units

Match the system of the technology being documented.

| Decimal                  | Binary                    |
| ------------------------ | ------------------------- |
| kB (kilobyte) = 1,000 B  | KiB (kibibyte) = 1,024 B  |
| MB (megabyte) = 1,000² B | MiB (mebibyte) = 1,024² B |
| GB (gigabyte) = 1,000³ B | GiB (gibibyte) = 1,024³ B |

Don't use MB when you mean MiB, or GB when you mean GiB.
