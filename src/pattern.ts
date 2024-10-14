import escape from "regexp.escape";

export type Pattern = {
  readonly isAll: boolean;
  test: (string: string) => boolean;
  toString: () => string;
};

export function createPattern(pattern: string): Pattern {
  if (!pattern) throw new Error("Pattern cannot be empty");

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

export function normalizePattern(
  definingOwner: string,
  pattern: string,
): string {
  return pattern.includes("/") ? pattern : `${definingOwner}/${pattern}`;
}

export function anyPatternMatches(
  patterns: Pattern[],
  string: string,
): boolean {
  for (const pattern of patterns) if (pattern.test(string)) return true;
  return false;
}
