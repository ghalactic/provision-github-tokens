import escape from "regexp.escape";

export type Pattern = {
  test: (string: string) => boolean;
  toString: () => string;
};

export function createPattern(pattern: string): Pattern {
  const expression = new RegExp(
    `^${pattern.split("*").map(escape).join("[^/]*")}$`,
  );

  return {
    test: (string) => expression.test(string),

    toString: () => {
      return pattern;
    },
  };
}
