---
name: google-developer-style-guide-images-media
description: >-
  Image and media rules from the Google developer documentation style guide.
  Covers alt text, image quality, screenshots, diagrams, and figure formatting.
---

# Images and media reference

## General principle

Use images **only** when they provide useful visual explanations that are
difficult to express with words. For screenshots, only capture UIs important to
the discussion.

## Creating and saving images

### Format selection

| Type                          | Preferred Format | Notes                        |
| ----------------------------- | ---------------- | ---------------------------- |
| Diagrams (architecture, flow) | SVG              | Stays sharp on zoom          |
| Screenshots / raster fallback | PNG              | Default when SVG unavailable |
| Animations / video            | MP4              | **Don't** use animated GIF   |

- Don't use transparent backgrounds (causes issues with lightbox widgets).

### Screenshots

- Be consistent within a document/doc set in OS used for screenshots.
- Be consistent in screenshot appearance (e.g., drop shadows).
- **Crop** to show only relevant information—helps reader focus and
  future-proofs against UI changes.
- Don't include personally identifying information (PII).
  - Hide PII with a **solid-color overlay at 100% opacity**.
  - **Don't** use blurs, mosaic effects, or similar—these can be reversed.
  - If exporting to a layered format (PDF, TIFF), **flatten** the image on
    export.

### General rules

- **Don't** use images of text, code samples, or terminal output. Use actual
  text.
- **Don't** use image maps. Provide a list of text references instead.
  - Reasons: accessibility problems, inconsistent browser support, scaling
    issues on mobile, maintenance complexity of coordinate overlays.
- Use descriptive filenames (see the Filenames and file types section in the
  `google-developer-style-guide-formatting` skill).

## Text associated with images

Four distinct text elements exist for images:

| Element               | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| Introductory sentence | Precedes the image in body text                      |
| Alt text              | Concise replacement text for non-visual contexts     |
| Figure caption        | Summary below the figure (optional)                  |
| Figure description    | Detailed text equivalent of the figure's information |

### Introductory sentences

- Always introduce an image with a **complete sentence**.
- End with a **colon** if the image immediately follows; end with a **period**
  if other material (e.g., a note) separates the introduction from the image.
- **Exception:** Screenshots that immediately follow procedural text describing
  a UI do not need an introduction.

### Alt text

**Core rule:** Replacing every image with its alt text must not change the
meaning of the page.

#### When to use empty alt text (`alt=""`)

Use `alt=""` for **decorative** (non-informative) images:

- Screenshots showing a user how to fill out fields.
- Icons in the UI.
- Images that only make the page visually appealing.

The `alt` attribute is **always required** on `<img>`, even if empty (`alt=""`).
Omitting it causes screen readers to read the filename aloud.

#### Writing rules

| Rule                                 | Do                                                                                      | Don't                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| No filler phrases                    | `alt="Architecture of an app built with Apps Script."`                                  | `alt="Image of the architecture..."` / `alt="Photo of..."` |
| Include punctuation                  | `alt="A card message."`                                                                 | `alt="A card message"` (no period)                         |
| Consistent for repeated images       | Use same alt text for the same control/icon/indicator everywhere                        | Vary alt text for the same repeated image                  |
| Avoid ALL-CAPS                       | Use normal sentence case                                                                | ALL-CAPS (some screen readers spell out each letter)       |
| Introduce diagrams in body text      | Write introduction before the image                                                     | Put introductory context inside alt text                   |
| Don't replace alt text with captions | Provide both independently                                                              | Use caption as substitute for alt                          |
| Use full sentences or noun phrases   | `alt="Architecture of an app that's built with Apps Script."` / `alt="A card message."` | Sentence fragments or bare keywords                        |
| Max ~155 characters                  | Keep alt text ≤ 155 chars                                                               | Overly long alt text                                       |
| Overflow strategy                    | If >155 chars needed: brief summary in `alt`, detailed description in surrounding text  | Cramming everything into alt                               |
| Context-aware                        | Consider the context of the image, not just its content                                 | Describe only literal content                              |

### Figure captions

- Optional. Figure numbers are also optional.
- When using `<figcaption>`, wrap both `<figcaption>` and `<img>` in a
  `<figure>` element.

#### Formatting

| Do                                                                                                   | Don't                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Figure 1.** Application capabilities are separated into bounded contexts that migrate to services. | Bounded contexts                     |
| Application capabilities are separated into bounded contexts that migrate to services.               | (caption without a complete thought) |

- If using figure numbers, format: **Figure NUMBER.** DESCRIPTION.
- Use **complete sentences** in captions.
- **Always** use end punctuation.

#### Referencing figures

| Do                                  | Don't                                       |
| ----------------------------------- | ------------------------------------------- |
| "... as shown in figure 1."         | "... as shown in the image above."          |
| Refer by figure number consistently | Use spatial descriptions ("above", "below") |

- Don't capitalize "figure" in references (except at start of sentence).
- If not using figure numbers and need to re-reference, show the figure again
  for accessibility.
- Don't include the figure caption in a sentence referencing the figure.

### Figure descriptions

- Provide text that conveys the **same information** as the figure.
- Use when a caption alone doesn't convey the full purpose/information.
- Use punctuation.
- **Any new information must be conveyed through text**, never introduced only
  in a figure.

### Text in figures

- **Avoid** embedding explanatory text in graphics—hurts accessibility,
  searchability, and increases localization costs.
- If text must be embedded, also provide the same information in an accessible
  form (e.g., figure description).

| Rule                              | Detail                                                                |
| --------------------------------- | --------------------------------------------------------------------- |
| Keep text brief                   | Avoid complete sentences and punctuation when possible                |
| No embedded captions/descriptions | Put captions and descriptions in text following the figure            |
| No new abbreviations              | Don't create abbreviations to condense text                           |
| Sentence case                     | Follow heading capitalization guidelines                              |
| Numbered callouts                 | Use for structuring figure descriptions, not for detailed annotations |
| Full product names                | Use full trademarked product names                                    |

### HTML example structure

```html
<p>Introductory sentence:</p>
<figure id="bounded">
  <img src="image.svg" alt="Bounded contexts are applied to an application." />
  <figcaption>
    <b>Figure 1.</b> Application capabilities are separated into bounded
    contexts that migrate to services.
  </figcaption>
</figure>
<div id="descr-1">
  <p>In figure 1, the capabilities are separated as follows:</p>
  <ul>
    <li>...</li>
  </ul>
</div>
```

### Markdown example structure

```markdown
Introductory sentence:

![Bounded contexts are applied to an application.](image.svg)

**Figure 1.** Application capabilities are separated into bounded contexts that
migrate to services.

In figure 1, the capabilities are separated as follows:

- ...
```

## High-resolution images

Use `srcset` to provide high-resolution image variants.

```html
<img
  src="/assets/images/skateboard.png"
  srcset="/assets/images/skateboard.png 1x, /assets/images/skateboard_2x.png 2x"
  width="375"
  alt=""
/>
```

### Rules

| Rule                   | Detail                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `width` attribute      | Set to CSS pixel size. Don't set `height`—it auto-calculates from width and aspect ratio.                                                                         |
| `src` attribute        | Always point to the **1x** (standard-resolution) image, not 2x. Older browsers on low-res devices use `src`; don't force them to download the larger image.       |
| `2x` naming convention | Use `BASENAME_2x.EXTENSION` for clarity. The `2x` qualifier after the filename tells the browser the resolution.                                                  |
| `2x` dimensions        | Exactly twice the width and height of `1x` (±1 pixel tolerance). E.g., 1x = 438×250, 2x = 875×500.                                                                |
| Don't upscale          | Never scale up a `1x` image to create a `2x` version. If only `1x` exists, use it alone. If starting from a high-res original, scale down for both `1x` and `2x`. |
| Future sizes           | `srcset` supports `3x`, `4x`, etc. Currently only `2x` is needed.                                                                                                 |
| `srcset` completeness  | A browser using `srcset` **ignores** `src`. List **all** available resolutions in `srcset`.                                                                       |
| Always include `src`   | Required for browsers that don't support `srcset`.                                                                                                                |

## Page layout rules

| Rule                          | Detail                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| No manual positioning         | Don't use `style` attributes or workarounds for justification/margins. Use site standard CSS.         |
| Image size                    | Don't make images too small. Full page width is fine.                                                 |
| Print consideration           | Consider how the image looks when printed.                                                            |
| Max width                     | Don't exceed the column width (e.g., 856px on developer.android.com; 2x version max 1712px).          |
| Resize screenshots            | Full-resolution screenshots often need resizing. Request 856px/1712px pairs from designers if needed. |
| No same-page links to figures | Don't link to a figure from within the same page unless it's very long and the link is from far away. |
| No centering                  | Don't center images on the page.                                                                      |
| No `<img>` inside `<p>`       | Don't put an `img` element inside a `p` element.                                                      |
