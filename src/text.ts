export function indent(prefix: string, text: string): string {
  return text.replace(/^/gm, prefix);
}
