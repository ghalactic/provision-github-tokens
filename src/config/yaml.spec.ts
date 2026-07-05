import { expect, it } from "vitest";
import { throws } from "../../test/error.js";
import { parseYaml } from "./yaml.js";

it("can parse valid YAML", () => {
  expect(parseYaml([], "- 100\n- 200\n")).toEqual([100, 200]);
});

it("can parse empty documents", () => {
  expect(parseYaml({}, "")).toEqual({});
});

it("can parse comment-only documents", () => {
  expect(parseYaml([], "# comment only\n")).toEqual([]);
});

it("throws a source-aware syntax error", () => {
  expect(
    throws(() =>
      parseYaml({}, "{", "account-self/repo-self/path/to/provider-config.yml"),
    ),
  ).toMatchInlineSnapshot(`
    "Invalid YAML in account-self/repo-self/path/to/provider-config.yml

    Caused by: Flow map must end with a } at line 1, column 2:

    {
     ^"
  `);
});

it("handles deferred YAML resolution errors", () => {
  expect(
    throws(() => {
      parseYaml({}, "a: *x\n");
    }),
  ).toMatchInlineSnapshot(`
    "Invalid YAML

    Caused by: Unresolved alias (the anchor must be set before the alias): x"
  `);
});
