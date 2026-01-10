import { expect, it } from "vitest";
import { compareProvisionRequestTarget } from "../../../src/compare-provision-request-target.js";
import type { ProvisionRequestTarget } from "../../../src/provision-request.js";

it("sorts targets by account", () => {
  const targets: ProvisionRequestTarget[] = [
    { platform: "github", type: "actions", target: { account: "account-b" } },
    { platform: "github", type: "actions", target: { account: "account-c" } },
    { platform: "github", type: "actions", target: { account: "account-a" } },
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    { platform: "github", type: "actions", target: { account: "account-a" } },
    { platform: "github", type: "actions", target: { account: "account-b" } },
    { platform: "github", type: "actions", target: { account: "account-c" } },
  ]);
});

it("sorts targets by repo", () => {
  const targets: ProvisionRequestTarget[] = [
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-c" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-c" },
    },
  ]);
});

it("sorts targets by environment", () => {
  const targets: ProvisionRequestTarget[] = [
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-c" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-c" },
    },
  ]);
});

it("sorts account targets, then repo targets, then environment targets", () => {
  const targets: ProvisionRequestTarget[] = [
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    { platform: "github", type: "actions", target: { account: "account-b" } },
    { platform: "github", type: "actions", target: { account: "account-a" } },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    { platform: "github", type: "actions", target: { account: "account-a" } },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-a" },
    },
    {
      platform: "github",
      type: "environment",
      target: { account: "account-a", repo: "repo-a", environment: "env-b" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-b" },
    },
    { platform: "github", type: "actions", target: { account: "account-b" } },
  ]);
});

it("sorts account targets by type", () => {
  const targets: ProvisionRequestTarget[] = [
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a" },
    },
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a" },
    },
  ]);
});

it("sorts repo targets by type", () => {
  const targets: ProvisionRequestTarget[] = [
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
  ];

  expect(targets.toSorted(compareProvisionRequestTarget)).toEqual([
    {
      platform: "github",
      type: "actions",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "codespaces",
      target: { account: "account-a", repo: "repo-a" },
    },
    {
      platform: "github",
      type: "dependabot",
      target: { account: "account-a", repo: "repo-a" },
    },
  ]);
});
