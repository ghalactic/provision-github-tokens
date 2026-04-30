import { expect, it } from "vitest";
import { capitalize } from "../../../src/text.js";

it.each`
  text             | expected
  ${""}            | ${""}
  ${"hello world"} | ${"Hello world"}
  ${"hELLO"}       | ${"HELLO"}
  ${"𐐴ello"}       | ${"𐐌ello"}
`(
  "capitalizes $text to $expected",
  ({ expected, text }: { expected: string; text: string }) => {
    expect(capitalize(text)).toBe(expected);
  },
);
