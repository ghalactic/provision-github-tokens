import { expect, it } from "vitest";
import { normalizeTokenReference } from "../../../src/token-reference.js";
import { throws } from "../../error.js";

it("doesn't allow empty references", () => {
  expect(
    throws(() =>
      normalizeTokenReference("defining-account", "defining-repo", ""),
    ),
  ).toMatchInlineSnapshot(`"Token reference cannot be empty"`);
});

it("doesn't allow references with a dot but no slash", () => {
  expect(
    throws(() =>
      normalizeTokenReference("defining-account", "defining-repo", "a.b"),
    ),
  ).toMatchInlineSnapshot(
    `"Token reference "a.b" repo part must contain exactly one slash"`,
  );
});

it("doesn't allow references with an empty repo account part", () => {
  expect(
    throws(() =>
      normalizeTokenReference(
        "defining-account",
        "defining-repo",
        "/repo.tokenA",
      ),
    ),
  ).toMatchInlineSnapshot(
    `"Token reference "/repo.tokenA" repo account part cannot be empty"`,
  );
});

it("doesn't allow references with an empty repo name part", () => {
  expect(
    throws(() =>
      normalizeTokenReference(
        "defining-account",
        "defining-repo",
        "account/.tokenA",
      ),
    ),
  ).toMatchInlineSnapshot(
    `"Token reference "account/.tokenA" repo name part cannot be empty"`,
  );
});

it("doesn't change references with an account and repo", () => {
  expect(
    normalizeTokenReference(
      "defining-account",
      "defining-repo",
      "account/repo.tokenA",
    ),
  ).toBe("account/repo.tokenA");
});

it("adds the defining account and repo to references without a dot", () => {
  expect(
    normalizeTokenReference("defining-account", "defining-repo", "tokenA"),
  ).toBe("defining-account/defining-repo.tokenA");
});

it("adds the defining account to references with a dot account", () => {
  expect(
    normalizeTokenReference(
      "defining-account",
      "defining-repo",
      "./repo.tokenA",
    ),
  ).toBe("defining-account/repo.tokenA");
});

it("handles references with repo names that contain dots", () => {
  expect(
    normalizeTokenReference(
      "defining-account",
      "defining-repo",
      "account/r.e.p.o.tokenA",
    ),
  ).toBe("account/r.e.p.o.tokenA");
  expect(
    normalizeTokenReference(
      "defining-account",
      "defining-repo",
      "./r.e.p.o.tokenA",
    ),
  ).toBe("defining-account/r.e.p.o.tokenA");
});
