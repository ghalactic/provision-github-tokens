---
name: google-developer-style-guide-formatting
description: >-
  Formatting rules from the Google developer documentation style guide. Covers
  text formatting, code in text, code samples, UI elements, HTML formatting,
  filenames, placeholders, and command-line syntax.
---

# Text formatting summary

## Bold

- Use `<b>` / `**` **only** for UI element names and run-in headings (including
  at the beginning of notices).
- In Markdown, prefer `**` over `__` (easier to distinguish from other
  formatting).

## Italic

- Use `<i>` / `_` for:
  - Introducing or discussing terms, words as words.
  - Emphasis (importance)—but prefer writing that carries emphasis without
    formatting.
  - Titles of full-length works (books, movies, web series)—unless part of a
    link.
  - Mathematical variables (e.g., _x_ + _y_ = 3)—don't italicize operators.
  - Version variables (e.g., version 1.4._x_).
- In HTML, use `<em>` for semantic emphasis (renders as italic).
- In Markdown, prefer `_` over `*` for italic (easier to distinguish from bold
  `**`).

## Underline

- Reserve exclusively for link text.

## Code font

- Use `<code>` / `` ` `` for inline code, user input, code in text.
- Use `<pre>` / ` ``` ` for code blocks.
- Never override or modify font styles inline.

## Capitalization

- American English style for general capitalization.
- **Sentence case** for all headings, titles, navigation.
- **ALL-CAPS** for placeholder names.

## Quotation marks

- American English punctuation style.
- Shorter work titles (articles, episodes) → quotation marks, unless part of a
  link.

## Font type, size, color

- Never override global styles for font type, size, or color.
- Use semantic HTML / Markdown to control style.

## Other punctuation

- Don't use `&` as conjunction. Write _and_. **Exception:** referring to a UI
  element that uses `&`.
- Quotation marks and end punctuation go **outside** link text.

---

# Code in text

Use code font (`` ` `` / `<code>`) in running text for anything related to code.

## Items that MUST be in code font

| Item                                          | Example                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| Attribute names and values                    | `imageURL`, `e2-highcpu-16`                                |
| Class names                                   | `SnapshotDiskOperator`                                     |
| Command output                                | `Found sysprep-specialize-script-ps1 in metadata.`         |
| CLI utility names                             | `gcloud`, `gsutil`, `kubectl`, `bq`                        |
| Data types                                    | `STRUCT`                                                   |
| Database elements (rows, columns)             | `month`, `datetime`                                        |
| Defined (constant) values                     | `"San Francisco"`                                          |
| DNS record types                              | `AAAA`                                                     |
| Element names (HTML/XML)                      | `script`, `ClinicalDocument`—no angle brackets around name |
| Enum names                                    | `BOOL = 1;`                                                |
| Environment variable names                    | `CHROME_REMOTE_DESKTOP_DEFAULT_DESKTOP_SIZES`              |
| Filenames, extensions, paths                  | `pg_hba.conf`, `/etc/postgresql/13/main`                   |
| Folders and directories                       | `deployments`                                              |
| HTTP content-type values                      | `application/fhir+json`                                    |
| HTTP status codes                             | `500 Internal Server Error`                                |
| HTTP verbs                                    | `POST`                                                     |
| IAM role names                                | `roles/cloudfunctions.invoker`                             |
| IP addresses                                  | `10.10.10.10`                                              |
| Language keywords                             | `FROM`                                                     |
| Method and function names                     | `get_job_status`                                           |
| Namespace aliases                             | `default`                                                  |
| Placeholder variables                         | `SUBNETWORK_NAME`                                          |
| Package names                                 | `beautifulsoup4`                                           |
| Port numbers                                  | `50000`                                                    |
| Query parameter names/values                  | `recursive=true`                                           |
| Strings used in commands/code (URLs, domains) | `https://hr.example.com`                                   |
| Text input                                    | `config-management`                                        |
| UI elements rendered from prior input         | **`my-sql-cluster1`** (bold + code)                        |

Don't put quotation marks around code (unless quotes are part of the code).

## Items in ordinary (non-code) font

| Item                                       | Example                                                    |
| ------------------------------------------ | ---------------------------------------------------------- |
| Domain names (not in code context)         | example.com                                                |
| Product / service / org names              | Google Docs, Google Sheets                                 |
| URLs the reader should follow in a browser | https://support.example.com (prefer descriptive link text) |

## Code in UI elements

If a UI element meets code-font requirements → use **both bold and code font**.

- ✅ In the **Network** list, select **`my-net-2`**.
- ✅ In the **Query results** pane, the **`Store`** column is displayed.

## Items sometimes in code font

- **Boolean values**: `true`/`false` as data type values → code font. Evaluation
  of a condition as true/false → non-code font.
  - ✅ If the update succeeds, returns `true`.
  - ✅ `enableCertificateValidation`: If true, validates the SSL certificate.
- **CLI utility names**: Code font for the command; ordinary font for the
  project/product name.
  - ✅ Invoke the GCC 8.3 compiler using `gcc`.
  - ✅ The options for the `curl` command are explained on the curl project
    website.
- **Email addresses**: Code font if computer input/output; non-code + hyperlink
  if contact info.
  - ✅ Enter `alex`, not `alex@example.com`.
  - ✅ For help, contact [support@example.com](mailto:support@example.com).

## Method names

Omit class name unless needed for disambiguation.

- ✅ Call its `get` method.
- ❌ Call its `animal.get` method.

## HTTP status codes

- Single code: an HTTP `400 Bad Request` status code. Call it a _status code_
  (not _response code_ or _error code_). Number + name in code font.
- Range: an HTTP `2xx` or `400` status code. Use _Nxx_ for N00–N99 range.
  Numbers always in code font.
- Exact range: an HTTP status code in the `200`–`299` range.

## Grammatical treatment of code elements

Never inflect code elements (no plurals, no possessives, no verbing). Add a noun
after the element.

| ✅ Do                                                               | ❌ Don't                                      |
| ------------------------------------------------------------------- | --------------------------------------------- |
| The `ADDRESS` constant's value is defined in the `settings.h` file. | `ADDRESS`'s value is defined in `settings.h`. |
| Send a `POST` request.                                              | `POST` the data.                              |
| Send a `GET` request.                                               | `GET`ting the data.                           |
| You can't close the file before opening it.                         | `Close`ing requires you to have `open`ed it.  |
| An array of `INT64` values                                          | ARRAY of INT64                                |

## Linking API terms in Android

- Link first instance of each API element (class, method, constant, XML
  attribute) in code font using `<a>`. Later instances: code font, no link.
- Common classes (`Activity`, `Intent`, etc.) don't need linking every time.
  When used as a concept (not a class instance), don't capitalize or use code
  font.
- Link to methods using fragment identifiers; static methods include class name
  in link text.

---

# Code samples

## Basic guidelines

- Follow indentation of the relevant language style guide (usually 2 spaces;
  some contexts use 4 spaces or tabs).
- Wrap lines at 80 characters (shorter if narrow reading context expected).
- Mark code blocks as preformatted: `<pre>` in HTML; indent 4 spaces in
  Markdown.
- Indicate omitted code with a **comment in the language's syntax**—never `...`
  or `…`. Don't format blocks with omissions as click-to-copy.

```
apiVersion: serving.knative.dev/v1
kind: Service
# Several lines of code are omitted here.
spec:
  template:
```

## Introductory statements

- Precede code samples with an introductory sentence/paragraph.
- End with **colon** if it immediately precedes the sample.
- End with **period** if more material appears between intro and sample, or the
  intro's last sentence isn't directly about the sample.

| ✅ Do                                                  | ❌ Don't                                               |
| ------------------------------------------------------ | ------------------------------------------------------ |
| The following shows how to use `get`: [sample]         | —                                                      |
| Shows how to use `get`. For info, see [link]. [sample] | Shows how to use `get`. For info, see [link]: [sample] |

---

# UI elements and interaction

## Focus on the task

Prefer task-oriented instructions over widget-oriented ones.

- ✅ Refresh the page.
- ✅ Expand the **Advanced options** section.

But when the UI isn't obvious or the procedure guides through elements, name
them explicitly.

## Formatting UI element names

- **Bold** (`<b>` / `**`) for any named UI element (buttons, menus, dialogs,
  windows, list items, etc.).
- Don't use code font for UI elements unless they meet code-font requirements
  (then use **bold + code**).
- Don't bold product/feature names unless they directly refer to a visible
  on-page element.

| ✅ Do                                                                        | ❌ Don't                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| In the **New project** window, select **New activity**, then click **Next**. | In the New Project window, select "New Activity", then click the "Next" button. |

## Capitalization of UI labels

- Match the page label's capitalization, **except**:
  - All-uppercase labels → use sentence case. ✅ **Refresh** ❌ **REFRESH**
  - Inconsistently cased labels → use sentence case for all.

## Referring to UI elements

Don't use UI element names as verbs or nouns.

| ✅ Do                                              | ❌ Don't                          |
| -------------------------------------------------- | --------------------------------- |
| In the **Name** field, enter an account name.      | **Name** the account.             |
| To save, click **Save**.                           | **Save** the settings.            |
| In the **Service account ID** field, enter a name. | Specify a **Service account ID**. |

## UI element terminology

### Windows, pages, dialogs, panes, sections

| Term                 | Use for                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Window**           | Entire app window or modular app elements. Use for desktop apps.                        |
| **Page**             | Web page or console subpage. Preferred for web.                                         |
| **Dialog**           | Smaller window detached from main app, appears in front. Not "pop-up window".           |
| **Pane** / **Panel** | Distinct rectangular region within a window. Not "window", "section", "area", "column". |
| **Section**          | Labeled grouping of options/controls within a window/pane. Not "area" or "column".      |

### Menus

- Refers to items in a menu: use _command_ (not _choice_, _menu item_,
  _option_). Exception: documenting how to build an interface → _menu item_ OK.
- Form: _the **Label** menu_.
- Don't use _drop-down_ as synonym for _menu_.

### Angle bracket notation for menus

Use `>` with nonbreaking space before it. Bold the entire sequence. Add
`aria-label="and then"` on a span around `>`.

```html
Select
<b
  >View&nbsp;<span aria-label="and then">></span> Tools&nbsp;<span
    aria-label="and then"
    >></span
  >
  Developer Tools</b
>.
```

Only for menu items. Don't use for combining different UI element types.

- ✅ Select **MyApp > Preferences**, then select the **Languages** preference
  pane.
- ❌ Select **MyApp** > **Preferences** > **Languages** > **+** > **CSS**.

### Navigation menu

Use _navigation menu_. Don't use _navigation bar/pane/panel/window_.

### Toolbar

_Toolbar_ = set of buttons. _Menu button_ = toolbar button with a menu. Name the
toolbar if it helps the user find the button.

### Buttons and icons

- Refer to button by its **label**. ✅ Click **OK**. ❌ Click the "OK" button.
- Icon button: use tooltip name, add icon image before name. ✅ Click
  ![](/icon.png) **Add**. ❌ Click the ![hammer](/icon.png) icon.
- If tooltip missing, file a bug.
- Omit trailing ellipsis from button names. ✅ **Browse** ❌ **Browse ...**
- Don't use directional language (above, below, right-hand side). Use icon+name,
  context, or screenshot instead.

### Tab

Form: _the **Label** tab_.

### Text box / field

- _Text box_ / _box_: the **Label** box. In Google Cloud / Google Workspace
  docs, use _field_.
- Format user-typed text with code font.

### List box, combo box, spin box

- _List box_: the **Label** list / box.
- _Combo box_: the **Label** box. Verbs: _type or select_, _enter_.
- _Spin box_: the **Label** box. Verb: _enter_.

### Checkbox

- Form: _the **Label** checkbox_.
- Prefer _select_ / _clear_ over _check_ / _uncheck_.
- State: _selected_ / _not selected_.

### Radio button

- Use the label. Or refer to the group: _For **Startup mode**, select an
  option._

### Expander arrow

- Terms: _expander arrow_, _expandable section_. Not _expando_ or _zippy_.

### Toggle

- Don't use _toggle_ as a verb. Describe the action.
- ✅ Click the **Wi-Fi** toggle. / Click the **Magic mode** toggle to the on
  position.

## Keyboard keys

- Use `<kbd>` in HTML or monospace in other markup.
- Uppercase for letter keys. ✅ Control+S ❌ Control+s
- For text input of a key value, use `<code>` not `<kbd>`.
- Spell out modifier key names: Command, Control, Option, Shift. No symbols.
- Combination format: MODIFIER+KEY. With Shift: MODIFIER+Shift+KEY.
- Multi-OS: ✅ Control+C (or Command+C on macOS) ❌ Ctrl+C (⌘+C)
- Spell out ambiguous character names: comma, hyphen, period, plus.
- Terms: _keyboard shortcut_ or _key combination_.
- Verbs: _press_ (to trigger action), _enter_ / _type_ (for text input).

## Prepositions for UI elements

| Preposition | Elements                                      |
| ----------- | --------------------------------------------- |
| **in**      | dialogs, fields, lists, menus, panes, windows |
| **on**      | pages, tabs, toolbars                         |

## Verbs for procedures

click, choose, drag, enable, enter/type, go to, hold the pointer over, press,
select, tap, turn on/turn off.

---

# HTML formatting

Follow Google's HTML/CSS Style Guide. Exception: don't leave out optional
elements.

## Basic rules

- **No tabs**—use spaces only.
- **Indent 2 spaces** per level.
- **All-lowercase** for elements and attributes.
- **No trailing spaces** (except where Markdown requires them).

## Line length

- Break at **80 characters**, except:
  - `<meta>` lines at file start → any length.
  - URLs in links → can't break. Put long `href` on its own line.
  - Older files with consistent different line length → match existing
    convention for small changes.
- Break `<pre>` blocks at 80 characters. Don't change code meaning when
  breaking.

```html
You can find more information in
<a href="https://example.com/very-long-url...">his biography</a>.
```

---

# Filenames and file types

## Naming guidelines

- **Lowercase** filenames and directories (occasional exception for
  consistency).
- **Hyphens** between words (not underscores). Hyphens are treated as spaces by
  search engines; underscores are not.
- **ASCII alphanumeric** characters only.
- No generic names like `document1.html`.

| ✅ Do                 | ❌ Don't              |
| --------------------- | --------------------- |
| `avoiding-cliches.jd` | `avoidingcliches.jd`  |
| `avoiding-cliches.jd` | `avoidingCliches.jd`  |
| `avoiding-cliches.jd` | `avoiding-clichés.jd` |

### Exception: consistency

If existing directory uses underscores and changing isn't feasible → underscores
OK. E.g., `lesson_4.jd` to match `lesson_1.jd`, `lesson_2.jd`, `lesson_3.jd`.

### Exception: generated files

Tool-generated reference docs may use different naming conventions from the
product/API.

## Referring to filenames

- Use **code font**.
- Include the word _file_ after the filename.
- Use exact spelling even if it breaks naming guidelines.
- If including a file sample, precede it with intro sentence that includes the
  filename.

✅ In the following `build.sh` file, modify the default values for all
parameters:

## Referring to file interactions

Don't use file types as verbs.

- ✅ Extract a zip file.
- ❌ Unzip a zip file.

## Referring to file types

Use the **formal type name** (often all-caps), not the extension.

| ✅ Do       | ❌ Don't      |
| ----------- | ------------- |
| a PNG file  | a `.png` file |
| a Bash file | an `.sh` file |

### Extension → file type name table

| Extension        | Type name       |
| ---------------- | --------------- |
| `.adoc`          | AsciiDoc file   |
| `.csv`           | CSV file        |
| `.exe`           | executable file |
| `.gif`           | GIF file        |
| `.img`           | disk image file |
| `.ipynb`         | IPYNB file      |
| `.jar`           | JAR file        |
| `.jpg` / `.jpeg` | JPEG file       |
| `.json`          | JSON file       |
| `.md`            | Markdown file   |
| `.pdf`           | PDF file        |
| `.png`           | PNG file        |
| `.ps`            | PowerShell file |
| `.py`            | Python file     |
| `.sh`            | Bash file       |
| `.sql`           | SQL file        |
| `.svg`           | SVG file        |
| `.tar`           | tar file        |
| `.tf`            | Terraform file  |
| `.tiff`          | TIFF file       |
| `.txt`           | text file       |
| `.wasm`          | Wasm file       |
| `.yaml`          | YAML file       |
| `.zip`           | ZIP file        |

---

# Placeholders

Placeholders represent values readers must replace (in code/commands) or values
that vary (in output).

## General rules

- Use descriptive names. Don't use single `x` or a series of `x`'s.
  **Exception:** standard contexts like HTTP status codes where `xx` is
  conventional.

## Formatting inline placeholders

**In code context (commands/samples):**

- HTML: `<code><var>PLACEHOLDER_NAME</var></code>`
- Markdown: ``*`PLACEHOLDER_NAME`*`` (asterisk outside backticks)

**Not in code context:**

- HTML: `<var>PLACEHOLDER_NAME</var>`

## Formatting placeholders in code blocks

- HTML: wrap in `<pre>`, tag placeholders with `<var>`.
- Markdown: code fences (` ``` `). Note: can't apply bold/italic inside code
  fences.

## Placeholder text style

**UPPERCASE_WITH_UNDERSCORES.**

| ✅ Do      | ❌ Don't                                                              |
| ---------- | --------------------------------------------------------------------- |
| `API_NAME` | `API-name`, `API_name`, `API name`, `api_name`, `api-name`, `apiName` |

If uppercase + underscores doesn't work in context → use something consistent.

**No possessive adjectives** in placeholders:

- ❌ `MY_API_NAME`, `YOUR_API_NAME`

## Explaining placeholders

Explain each placeholder on first use. Re-explain in lengthy docs, after many
placeholders, or in non-sequential docs.

### Single placeholder

Format: _Replace `PLACEHOLDER` with DESCRIPTION._

✅ Replace `BUILD_ID` with the ID of the `WORKING` build that you copied in the
preceding step.

### Two or more placeholders

- Intro: _Replace the following:_
- List placeholders in order of appearance.
- Format: `` `PLACEHOLDER` ``: description (lowercase start after colon).
- Examples in description: use em dash or _such as_.

```
Replace the following:

- `ADMIN_PROJECT_ID`: the project that owns the reservation
- `LOCATION`: the location of the reservation
```

### Placeholders in output

- Intro: _This output includes the following values:_
- Use `<var>` to identify placeholders in output.
- List in order of appearance: `` `PLACEHOLDER` ``: description.

---

# Command-line syntax

## Best practices

- Provide inline link to command reference.
- Use minimal optional arguments; rely on reference for full list.
- Click-to-copy examples should be runnable without editing (except placeholder
  replacement). Avoid `[]`, `|`, `{}`, `...` in click-to-copy.

## Formatting commands

- Block: `<pre>` in HTML, code fence in Markdown.
- Line > 80 chars: break before `-`, `--`, `_`, or quotes. Indent continuation
  lines by **4 spaces**.
- Each continuation line except the last must end with a continuation character:
  - Linux / Cloud Shell: ` \` (space + backslash)
  - Windows: ` ^` (space + caret)
- Follow with descriptive list of placeholders.
- End punctuation for options/arguments: use for complete sentences; omit for
  single words/noun phrases (unless mixed).
- For `bash`/`sh`: follow Google shell style guide quoting rules.

## Command prompt

- Multi-line input blocks: start each line with `$`.
- Don't show current directory path before prompt. But show context change
  (e.g., local → remote).
- One-line commands: `$` is optional. If doc mixes multi- and single-line, use
  `$` consistently.
- Separate input and output into different code blocks.

```
$ adb shell
shell@ $ screencap /sdcard/screen.png
shell@ $ exit
$ adb pull /sdcard/screen.png
```

## Optional arguments

Square brackets: `[OPTIONAL_ARG]`. Each optional arg in its own brackets.

```
gcloud dns GROUP [GLOBAL_FLAG] [FILENAME]
```

## Mutually exclusive arguments

Curly braces + pipe: `{CHOICE_A|CHOICE_B}`.

```
{FILE_1|FILE_2}
{--source=CLOUD_SOURCE --source-url=SOURCE_URL | --bucket=BUCKET [--source=LOCAL_SOURCE]}
```

## Repeatable arguments

Three dots, no spaces: `[GLOBAL_FLAG ...]`.

## Optional arguments in click-to-copy commands

Avoid `[]`, `{}`, `|`, `...` in click-to-copy. Instead:

1. **Remove optional args**—link to reference for full options.
2. **Separate code blocks** for each option variant.
3. **Separate sections/tasks** for different option combinations.
4. **Warn the reader** that the command contains optional args, then provide a
   concrete runnable example below.

## Output from commands

- Only show output if it adds value (reader copies a value or verifies
  something).
- Intro phrases: _The output is similar to the following:_ / _The output is the
  following:_
- Omitted output lines: `...` on a separate line (not `...` ellipsis character).

## Command-line terminology

### gcloud CLI

| Term                    | Meaning                                              |
| ----------------------- | ---------------------------------------------------- |
| Command / command group | Generally just call everything "commands" in docs    |
| Flag                    | Any element other than the command/group name        |
| Argument                | Value passed to a command or flag (e.g., a region)   |
| Option                  | Catchall term when avoiding specialized nomenclature |

### Linux commands

| Term          | Meaning                                                   |
| ------------- | --------------------------------------------------------- |
| Command name  | e.g., `find`                                              |
| Argument      | e.g., `/usr/src/linux` (a path)                           |
| Option        | e.g., `-follow`, `-type f` (hyphen is part of the option) |
| Metacharacter | `*`, `?`, `^`—for globbing/filename expansion             |
| Pipe          | `\|`—redirects output to another command                  |
| Redirection   | `>`, `<`, `<<`, `>>`                                      |

### Linux signals

Use these terms **only** in process-control context:

| Signal       | Verb              | Do NOT substitute                             |
| ------------ | ----------------- | --------------------------------------------- |
| `SIGKILL`    | _kill_            | cancel, end, exit, quit, stop, terminate      |
| `SIGTERM`    | _terminate_       | cancel, end, exit, quit, stop                 |
| `SIGQUIT`    | _quit_            | cancel, end, exit, quit, stop                 |
| `SIGINT`     | _interrupt_       | suspend, end, exit, pause, terminate          |
| `SIGPAUSE`   | _pause_ / _sleep_ | cancel, interrupt                             |
| `SIGSUSPEND` | _suspend_         | pause, exit                                   |
| `SIGSTOP`    | _stop_            | cancel, end, exit, interrupt, quit, terminate |
