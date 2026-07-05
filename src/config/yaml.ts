import { parseDocument } from "yaml";

export function parseYaml(
  emptyValue: unknown,
  source: string,
  filePath?: string,
): unknown {
  const doc = parseDocument(source, { logLevel: "error", prettyErrors: true });

  if (doc.errors.length > 0) {
    throw new ParseYamlError(new AggregateError(doc.errors), filePath);
  }

  try {
    return doc.contents === null ? emptyValue : doc.toJS();
  } catch (cause) {
    throw new ParseYamlError(cause, filePath);
  }
}

export class ParseYamlError extends Error {
  public readonly filePath?: string;

  constructor(cause: unknown, filePath: string | undefined) {
    super(filePath ? `Invalid YAML in ${filePath}` : "Invalid YAML", {
      cause,
    });
    this.filePath = filePath;
  }
}
