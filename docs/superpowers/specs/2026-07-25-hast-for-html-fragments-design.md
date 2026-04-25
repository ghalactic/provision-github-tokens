# Use hast for HTML fragments in job summary rendering

## Problem

The job summary rendering embeds raw HTML strings inside mdast `html` nodes
using template literals. This works but skips proper HTML escaping and makes it
harder to compose complex elements (e.g. adding styled children to `<summary>`
content). Adopting hast (the HTML counterpart to mdast in the unified ecosystem)
for these fragments brings type safety, proper escaping, and composability.

## Approach

Build hast element nodes as plain object literals (matching how mdast nodes are
already built), and serialize them with `hast-util-to-html`. Use `@types/hast`
for type definitions.

Only **self-contained HTML elements** become hast nodes:

- `<summary>` elements (token auth explainer, provision auth explainer)
- `<a id="...">` anchor elements (summary.ts heading builder)

The structural `<details>` and `</details>` tags stay as plain strings because
they wrap mdast content and cannot form complete hast trees.

## Changes

### Dependencies

Install `hast-util-to-html` (runtime) and `@types/hast` (dev).

### Token auth explainer

Replace `summaryText()` returning a string with a function that returns hast
`Element` children (array of hast `Text` nodes). Build a hast `<summary>`
element with those children, serialize with `toHtml()`, and embed in the
existing `html()` wrapper as `<details>\n${serializedSummary}`.

The `html("</details>")` call stays as-is.

### Provision auth explainer

Same pattern as token auth explainer. Replace `summaryText()` with hast children
and build a `<summary>` element.

### Summary heading anchors

Replace the `<a id="...">` template literal in `headingWithAnchor()` with a hast
`<a>` element (properties: `{ id: anchorId }`), serialized with `toHtml()`.

### ADR 0023

Add a brief mention that hast is used alongside mdast for HTML fragments that
are embedded within the mdast tree.

### Tests

All existing snapshot/fixture tests cover the HTML output. Regenerate fixtures
after changes. No new test files needed — the output should be identical.
