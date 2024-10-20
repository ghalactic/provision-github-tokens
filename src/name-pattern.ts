import escape from "regexp.escape";
import type { Pattern } from "./pattern.js";

export function createNamePattern(pattern: string): Pattern {
  if (!pattern) throw new Error("Pattern cannot be empty");
  if (pattern.includes("/")) throw new Error("Pattern cannot contain /");

  const literals = pattern.split("*");
  const expression = new RegExp(`^${literals.map(escape).join("[^/]*")}$`);

  let isAll = true;
  for (const l of literals) if (l) isAll = false;

  return {
    get isAll() {
      return isAll;
    },

    test: (string) => expression.test(string),
    toString: () => pattern,
  };
}
