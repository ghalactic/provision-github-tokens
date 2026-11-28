import { expect, it } from "vitest";
import { orderCandidates } from "./order-candidates.js";

it("returns the same order for the same work key", () => {
  const candidates = [
    { appId: 3, name: "c" },
    { appId: 1, name: "a" },
    { appId: 2, name: "b" },
  ];

  const first = orderCandidates("token-shape", candidates, (c) => c.appId);
  const second = orderCandidates("token-shape", candidates, (c) => c.appId);

  expect(second).toEqual(first);
});

it("doesn't depend on the candidate input order", () => {
  const candidates = [
    { appId: 3, name: "c" },
    { appId: 1, name: "a" },
    { appId: 2, name: "b" },
  ];

  const ordered = orderCandidates("token-shape", candidates, (c) => c.appId);
  const reversed = orderCandidates(
    "token-shape",
    [...candidates].reverse(),
    (c) => c.appId,
  );

  expect(reversed).toEqual(ordered);
});

it("returns every candidate exactly once", () => {
  const candidates = [
    { appId: 3, name: "c" },
    { appId: 1, name: "a" },
    { appId: 2, name: "b" },
  ];

  const ordered = orderCandidates("token-shape", candidates, (c) => c.appId);

  expect(ordered).toHaveLength(candidates.length);
  expect(new Set(ordered)).toEqual(new Set(candidates));
});

it("breaks weight ties by app ID", () => {
  // These app IDs produce the same weight for this work key. If the hash
  // changes, find another pair before adjusting this expectation.
  const candidates = [
    { appId: 43760, name: "higher" },
    { appId: 1729, name: "lower" },
  ];

  const ordered = orderCandidates(
    '{"account":"account-a","as":null,"permissions":{"metadata":"read"},"repos":"all"}',
    candidates,
    (c) => c.appId,
  );

  expect(ordered).toEqual([
    { appId: 1729, name: "lower" },
    { appId: 43760, name: "higher" },
  ]);
});

it("handles empty and single candidate lists", () => {
  const single = { appId: 1, name: "a" };

  expect(
    orderCandidates<{ appId: number }>("token-shape", [], (c) => c.appId),
  ).toEqual([]);
  expect(orderCandidates("token-shape", [single], (c) => c.appId)).toEqual([
    single,
  ]);
});

it("spreads work across candidates", () => {
  const candidates = [{ appId: 1 }, { appId: 2 }, { appId: 3 }];
  const counts = [0, 0, 0];

  for (let i = 0; i < 1000; ++i) {
    const [winner] = orderCandidates(`key-${i}`, candidates, (c) => c.appId);
    ++counts[winner.appId - 1];
  }

  for (const count of counts) {
    expect(count).toBeGreaterThan(250);
    expect(count).toBeLessThan(400);
  }
});
