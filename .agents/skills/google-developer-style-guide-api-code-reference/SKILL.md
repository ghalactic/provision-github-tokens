---
name: google-developer-style-guide-api-code-reference
description: >-
  API reference documentation rules from the Google developer documentation
  style guide. Covers code comments, class/method documentation, parameter
  descriptions, and API reference formatting.
---

# API reference code comments

Provide a complete API reference generated from source code document comments
for all public classes, methods, constants, and other members. Apply these
guidelines as appropriate per programming language.

**External references:**

- [AIP-192: Documentation](https://google.aip.dev/192)
- [Inline API documentation](https://cloud.google.com/apis/design/documentation)
  (Cloud API design guide)
- Language-specific style guides

## Documentation basics

### Required descriptions (MUST)

| Element                                          | Requirement                                              |
| ------------------------------------------------ | -------------------------------------------------------- |
| Every class, interface, struct, union type, etc. | Description required                                     |
| Every constant, field, enum, typedef             | Description required                                     |
| Every method                                     | Description + each parameter + return value + exceptions |

### Strong suggestions

- Include a code sample (~5–20 lines) at the top of each unique page (class,
  interface, etc.).
- Use **code font** for all API names, classes, methods, constants, parameters.
  Link each to its reference page.
- Use **code font + double quotes** for string literals (e.g., `"wrap_content"`,
  `"true"`).
- Match class name spelling exactly as in code (correct casing, no spaces)—
  e.g., `ActionBar`.

### Class name pluralization

| Do                                     | Don't                   |
| -------------------------------------- | ----------------------- |
| `Intent` objects, `Activity` instances | `Intents`, `Activities` |

**Exception:** If a class name is a common term, you may use the lowercase
English word, not in code font (e.g., "activities", "action bar").

## Classes, interfaces, structs

**First sentence:** Briefly state the purpose/function of the class— information
not deducible from the name and signature.

**Additional documentation:** How to use the API, how to invoke/instantiate, key
features, best practices, pitfalls.

### First-sentence rules

| Rule                                                                                              | Example                             |
| ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Don't repeat the class name                                                                       | —                                   |
| Don't say "this class will/does ..."                                                              | —                                   |
| Don't use a period before the real end of the sentence (some generators truncate at first period) | Use "for example" instead of "e.g." |
| Make the first sentence unique, descriptive, and short (it may be extracted for class lists)      | —                                   |

**Example (Android `ActionBar`):**

> A primary toolbar within the activity that may display the activity title,
> application-level navigation affordances, and other interactive items.

## Members (constants, fields)

Keep descriptions **as brief as possible**. Link to relevant methods that use
the constant/field.

**Example (`DISPLAY_SHOW_HOME`):**

> Show 'home' elements in this action bar, leaving more space for other
> navigation elements. This includes logo and icon.
>
> See also: `setDisplayOptions(int)`, `setDisplayOptions(int, int)`

## Methods

**First sentence:** Briefly state the action the method performs. **Subsequent
sentences:** Why and how to use it, prerequisites, exceptions, related APIs.

**Always document:**

- Dependencies (e.g., permissions) needed to call the method
- Behavior when a dependency is missing (e.g., "throws a `SecurityException`" or
  "returns null")

**Use present tense** for all descriptions.

| Do                                       | Don't                  |
| ---------------------------------------- | ---------------------- |
| Adds a new bird to the ornithology list. | Will add a new bird... |
| Returns a bird.                          | Will return a bird...  |

### Method description patterns

| Method type                        | Opening pattern                          | Example                                                                            |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Performs operation + returns data  | Start with verb describing the operation | _Adds a new bird to the ornithology list and returns the ID of the new entry._     |
| Getter returning boolean           | "Checks whether ..."                     | _Checks whether this activity is in the process of being destroyed._               |
| Getter returning non-boolean       | "Gets the ..."                           | _Gets the current configuration._                                                  |
| Setter / turns on ability          | "Sets the ..."                           | —                                                                                  |
| Updates a property                 | "Updates the ..."                        | —                                                                                  |
| Deletes something                  | "Deletes the ..."                        | —                                                                                  |
| Registers callback/element         | "Registers ..."                          | —                                                                                  |
| Callback (usually `onXxx` methods) | "Called by ..."                          | _Called by Android when ..._ Then later: _Subclasses implement this method to ..._ |
| Convenience constructor            | "Creates a ..."                          | —                                                                                  |

### Parameters

| Rule                                | Detail                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Capitalization & punctuation        | Capitalize first word; end with a period                                          |
| Non-boolean parameters              | Begin with "The" or "A" if possible                                               |
| Boolean (tells API to do something) | State behavior for both true and false                                            |
| Boolean (declares existing state)   | "True if ...; false otherwise."                                                   |
| "true"/"false" wording              | Don't use code font or quotation marks in this context                            |
| Default values                      | Explain behavior for each value/range, then state default with format: _Default:_ |

**Non-boolean examples:**

> The ID of the bird you want to get.

> A description of the bird.

**Boolean (action) example:**

> `enableCertificateValidation`: If true, validates the SSL certificate before
> proceeding. If false, trusts the certificate without validating it.

**Boolean (state) example:**

> True if the zoom is set; false otherwise.

### Return values

Keep descriptions **as brief as possible**; put detailed info in the class
description.

| Return type | Pattern                         | Example                                                  |
| ----------- | ------------------------------- | -------------------------------------------------------- |
| Non-boolean | "The ..."                       | _The bird specified by the given ID._                    |
| Boolean     | "True if ...; false otherwise." | _True if the bird is in the sanctuary; false otherwise._ |

### Exceptions

| Context                         | Pattern                      | Example                           |
| ------------------------------- | ---------------------------- | --------------------------------- |
| Generator auto-inserts "Throws" | Start with "If ..."          | _If no key is assigned._          |
| Generator does NOT auto-insert  | Start with "Thrown when ..." | _Thrown when no key is assigned._ |

### Deprecations

**Required:** Tell the user what replacement to use.

- If versioned: mention the version it was first deprecated in.
- First sentence appears in summary/index—put the most important info there.
- Subsequent sentences: explain why deprecated, other useful details.
- If a method is deprecated: tell the reader how to update their code.

**Examples:**

> Deprecated. Use #CameraPose instead.

> Deprecated. Access this field using the `getField` method.
