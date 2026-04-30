export function capitalize(text: string): string {
  const [first = "", ...rest] = text;

  return `${first.toUpperCase()}${rest.join("")}`;
}

export function prefixLines(prefix: string, text: string): string {
  return text.replace(/^/gm, prefix);
}
