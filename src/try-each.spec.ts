import { expect, it } from "vitest";
import { tryEach } from "./try-each.js";

it("succeeds with the first candidate", async () => {
  const result = await tryEach(
    (candidate) => Promise.resolve(`token for ${candidate}`),
    () => true,
    ["a", "b"],
  );

  expect(result).toEqual({
    type: "SUCCEEDED",
    candidate: "a",
    value: "token for a",
    failures: [],
  });
});

it("records failed attempts before succeeding", async () => {
  const firstError = new Error("first");
  const result = await tryEach(
    (candidate) => {
      if (candidate === "a") throw firstError;

      return Promise.resolve("token");
    },
    () => true,
    ["a", "b"],
  );

  expect(result).toEqual({
    type: "SUCCEEDED",
    candidate: "b",
    value: "token",
    failures: [{ candidate: "a", error: firstError }],
  });
});

it("treats returned values, including undefined and errors, as success", async () => {
  const returnedError = new Error("returned");
  const undefinedResult = await tryEach(
    () => Promise.resolve(undefined),
    () => true,
    ["a"],
  );
  const errorResult = await tryEach(
    () => Promise.resolve(returnedError),
    () => true,
    ["a"],
  );

  expect(undefinedResult).toEqual({
    type: "SUCCEEDED",
    candidate: "a",
    value: undefined,
    failures: [],
  });
  expect(errorResult).toEqual({
    type: "SUCCEEDED",
    candidate: "a",
    value: returnedError,
    failures: [],
  });
});

it("fails after every candidate fails", async () => {
  const secondError = new Error("bang");
  const result = await tryEach(
    (candidate) => {
      // eslint-disable-next-line typescript/only-throw-error -- testing non-Error throws
      throw candidate === "a" ? "boom" : secondError;
    },
    () => true,
    ["a", "b"],
  );

  expect(result).toEqual({
    type: "FAILED",
    exhausted: true,
    failures: [
      { candidate: "a", error: "boom" },
      { candidate: "b", error: secondError },
    ],
  });
});

it("stops when shouldTryNext returns false", async () => {
  const firstError = new Error("first");
  const tried: string[] = [];
  const predicateCalls: { candidate: string; error: unknown }[] = [];
  const result = await tryEach(
    (candidate) => {
      tried.push(candidate);
      throw firstError;
    },
    (failure) => {
      predicateCalls.push(failure);

      return false;
    },
    ["a", "b"],
  );

  expect(result).toEqual({
    type: "FAILED",
    exhausted: false,
    failures: [{ candidate: "a", error: firstError }],
  });
  expect(tried).toEqual(["a"]);
  expect(predicateCalls).toEqual([{ candidate: "a", error: firstError }]);
});

it("calls shouldTryNext with the last failure", async () => {
  const error = new Error("only");
  const predicateCalls: { candidate: string; error: unknown }[] = [];
  const result = await tryEach(
    () => {
      throw error;
    },
    (failure) => {
      predicateCalls.push(failure);

      return false;
    },
    ["a"],
  );

  expect(result).toEqual({
    type: "FAILED",
    exhausted: true,
    failures: [{ candidate: "a", error }],
  });
  expect(predicateCalls).toEqual([{ candidate: "a", error }]);
});

it("throws when candidates are empty", async () => {
  await expect(
    tryEach(
      () => Promise.resolve("unused"),
      () => true,
      [],
    ),
  ).rejects.toThrow("Invariant violation: Expected at least one candidate");
});

it("tries candidates sequentially", async () => {
  const events: string[] = [];
  const result = await tryEach(
    async (candidate) => {
      events.push(`start ${candidate}`);
      await Promise.resolve();
      events.push(`end ${candidate}`);
      throw new Error(candidate);
    },
    (failure) => {
      events.push(`fail ${failure.candidate}`);

      return true;
    },
    ["a", "b"],
  );

  expect(events).toEqual([
    "start a",
    "end a",
    "fail a",
    "start b",
    "end b",
    "fail b",
  ]);
  expect(result.type).toBe("FAILED");
});
