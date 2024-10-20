import escape from "regexp.escape";

export type Pattern = {
  readonly isAll: boolean;
  isAllForOwner: (owner: string) => boolean;
  test: (string: string) => boolean;
  toString: () => string;
};

export function createPattern(pattern: string): Pattern {
  if (!pattern) throw new Error("Pattern cannot be empty");

  const literals = pattern.split("*");
  const expression = new RegExp(`^${literals.map(escape).join("[^/]*")}$`);

  let isAll = true;
  for (const l of literals) if (l) isAll = false;

  const slashIndex = pattern.indexOf("/");
  let ownerPattern: Pattern | undefined;
  let repoPattern: Pattern | undefined;
  if (slashIndex !== -1) {
    const ownerPart = pattern.slice(0, slashIndex);
    const repoPart = pattern.slice(slashIndex + 1);
    if (ownerPart) ownerPattern = createPattern(ownerPart);
    if (repoPart) repoPattern = createPattern(repoPart);
  }

  return {
    get isAll() {
      return isAll;
    },

    isAllForOwner: (owner) => {
      return ownerPattern && repoPattern
        ? repoPattern.isAll && ownerPattern.test(owner)
        : false;
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
