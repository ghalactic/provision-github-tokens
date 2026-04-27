export function prefixLines(prefix: string, text: string): string {
  return text.replace(/^/gm, prefix);
}
