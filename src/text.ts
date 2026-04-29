export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function prefixLines(prefix: string, text: string): string {
  return text.replace(/^/gm, prefix);
}
