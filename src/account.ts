export function normalizeAccountPattern(
  definingAccount: string,
  pattern: string,
): string {
  return pattern === "." ? definingAccount : pattern;
}
