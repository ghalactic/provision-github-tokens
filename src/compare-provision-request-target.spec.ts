import { expect, it } from "vitest";
import {
  createTestAccountProvisionRequestTarget,
  createTestEnvironmentProvisionRequestTarget,
  createTestRepoProvisionRequestTarget,
} from "../test/provision-request.js";
import { compareProvisionRequestTarget } from "./compare-provision-request-target.js";
import type { ProvisionRequestTarget } from "./provision-request.js";

it("sorts targets by account", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestAccountProvisionRequestTarget("actions", "account-b"),
    createTestAccountProvisionRequestTarget("actions", "account-c"),
    createTestAccountProvisionRequestTarget("actions", "account-a"),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a"),
    createTestAccountProvisionRequestTarget("actions", "account-b"),
    createTestAccountProvisionRequestTarget("actions", "account-c"),
  ]);
});

it("sorts targets by repo", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-b",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-c",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-b",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-c",
      "private",
    ),
  ]);
});

it("sorts targets by environment", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-b",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-c",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    ),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-b",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-c",
      "private",
    ),
  ]);
});

it("sorts account targets, then repo targets, then environment targets", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-b",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-b",
      "private",
    ),
    createTestAccountProvisionRequestTarget("actions", "account-b"),
    createTestAccountProvisionRequestTarget("actions", "account-a"),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    ),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a"),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-a",
      "private",
    ),
    createTestEnvironmentProvisionRequestTarget(
      "account-a",
      "repo-a",
      "env-b",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-b",
      "private",
    ),
    createTestAccountProvisionRequestTarget("actions", "account-b"),
  ]);
});

it("sorts account targets by type", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestAccountProvisionRequestTarget("codespaces", "account-a"),
    createTestAccountProvisionRequestTarget("dependabot", "account-a"),
    createTestAccountProvisionRequestTarget("agents", "account-a"),
    createTestAccountProvisionRequestTarget("actions", "account-a"),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestAccountProvisionRequestTarget("actions", "account-a"),
    createTestAccountProvisionRequestTarget("agents", "account-a"),
    createTestAccountProvisionRequestTarget("codespaces", "account-a"),
    createTestAccountProvisionRequestTarget("dependabot", "account-a"),
  ]);
});

it("sorts repo targets by type", () => {
  const targets: ProvisionRequestTarget[] = [
    createTestRepoProvisionRequestTarget(
      "codespaces",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "dependabot",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "agents",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    createTestRepoProvisionRequestTarget(
      "actions",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "agents",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "codespaces",
      "account-a",
      "repo-a",
      "private",
    ),
    createTestRepoProvisionRequestTarget(
      "dependabot",
      "account-a",
      "repo-a",
      "private",
    ),
  ]);
});
