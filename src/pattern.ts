export type Pattern = {
  readonly isAll: boolean;
  test: (string: string) => boolean;
  toString: () => string;
};

export function anyPatternMatches(
  patterns: Pattern[],
  string: string,
): boolean {
  for (const pattern of patterns) if (pattern.test(string)) return true;
  return false;
}
