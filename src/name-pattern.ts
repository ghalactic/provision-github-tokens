import escape from "regexp.escape";
import type { Pattern } from "./pattern.js";

export function createNamePattern(pattern: string): Pattern {
  if (!pattern) throw new Error("Pattern cannot be empty");

  if (pattern.includes("/")) {
    throw new Error(`Pattern ${JSON.stringify(pattern)} cannot contain /`);
  }

  const literals = pattern.split("*");
  const expression = patternRegExp(literals);

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

function patternRegExp(literals: string[]): RegExp {
  let exp = "^";
  for (let i = 0; i < literals.length; ++i) {
    if (i) exp += "[^/]*";
    exp += escape(literals[i]);
  }
  exp += "$";

  return new RegExp(exp);
}
