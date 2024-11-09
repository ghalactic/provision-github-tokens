export function escape(string: string | number): string {
  return String(string).replaceAll(/~/g, "~0").replaceAll(/\//g, "~1");
}
