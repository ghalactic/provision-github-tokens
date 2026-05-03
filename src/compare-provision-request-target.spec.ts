import { expect, it } from "vitest";
import { createTestProvisionRequestTarget } from "../test/provision-request.js";
import { compareProvisionRequestTarget } from "./compare-provision-request-target.js";
import type { ProvisionRequestTarget } from "./provision-request.js";

it("sorts targets by account", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestProvisionRequestTarget("actions", "account-b"),
    createTestProvisionRequestTarget("actions", "account-c"),
    createTestProvisionRequestTarget("actions"),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("actions", "account-b"),
    createTestProvisionRequestTarget("actions", "account-c"),
  ]);
});

it("sorts targets by repo", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-c"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-c"),
  ]);
});

it("sorts targets by environment", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-c",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-c",
    ),
  ]);
});

it("sorts account targets, then repo targets, then environment targets", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
    createTestProvisionRequestTarget("actions", "account-b"),
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-a",
    ),
    createTestProvisionRequestTarget(
      "environment",
      "account-a",
      "repo-a",
      "env-b",
    ),
    createTestProvisionRequestTarget("actions", "account-a", "repo-b"),
    createTestProvisionRequestTarget("actions", "account-b"),
  ]);
});

it("sorts account targets by type", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestProvisionRequestTarget("codespaces"),
    createTestProvisionRequestTarget("dependabot"),
    createTestProvisionRequestTarget("actions"),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestProvisionRequestTarget("actions"),
    createTestProvisionRequestTarget("codespaces"),
    createTestProvisionRequestTarget("dependabot"),
  ]);
});

it("sorts repo targets by type", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-a"),
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestProvisionRequestTarget("actions", "account-a", "repo-a"),
    createTestProvisionRequestTarget("codespaces", "account-a", "repo-a"),
    createTestProvisionRequestTarget("dependabot", "account-a", "repo-a"),
  ]);
});
