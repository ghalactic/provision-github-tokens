import escape from "regexp.escape";

export type Pattern = {
  readonly isAll: boolean;
  test: (string: string) => boolean;
  toString: () => string;
};

export function createPattern(pattern: string): Pattern {
  const literals = pattern.split("*");
  const expression = new RegExp(`^${literals.map(escape).join("[^/]*")}$`);

  return {
    get isAll() {
      for (const l of literals) if (l) return false;
      return true;
    },

    test: (string) => expression.test(string),
    toString: () => pattern,
  };
}
