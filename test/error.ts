export function throws(fn: () => void): string {
  try {
    fn();
  } catch (error) {
    return render(error);
  }

  return "";
}

function render(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  if (error instanceof AggregateError) {
    return error.errors.map(render).join("\n\n");
  }

  const cause = error.cause ? `\n\nCaused by: ${render(error.cause)}` : "";

  return `${error.message}${cause}`
    .replaceAll(/[ \t]+([\r\n]+)/gm, "$1")
    .trim();
}
