export function indentLines(prefix: string, text: string): string {
  return text.replace(/^/gm, prefix);
}

export function debugLines(text: string): string {
  return text.replace(/^/gm, "::debug::");
}
