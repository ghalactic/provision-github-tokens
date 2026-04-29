export function capitalize(text: string): string {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

export function prefixLines(prefix: string, text: string): string {
  return text.replace(/^/gm, prefix);
}
