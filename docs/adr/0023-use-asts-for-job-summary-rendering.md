---
status: accepted
---

# Use ASTs for job summary rendering

Job summaries are built by constructing an mdast (Markdown Abstract Syntax Tree)
and serializing to Markdown with the GFM extension. AST composition avoids
brittle string concatenation for the structured tables, headings, and link
reference definitions the summary contains, and sections can be added or
restructured without worrying about whitespace or escaping. String concatenation
and the imperative `@actions/core` summary helpers were rejected as fragile for
this structure; the mdast libraries do add to bundle size.
