import { expect, it } from "vitest";
import { compareProvisionRequest } from "../../../src/compare-provision-request.js";
import type { RepoReference } from "../../../src/github-reference.js";
import type { ProvisionRequest } from "../../../src/provision-request.js";
import { createTestSecretDec } from "../../declaration.js";

it("sorts requests by requester", () => {
  const repoAA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoAB: RepoReference = { account: "account-a", repo: "repo-b" };
  const repoAC: RepoReference = { account: "account-a", repo: "repo-c" };
  const repoBA: RepoReference = { account: "account-b", repo: "repo-a" };
  const repoBB: RepoReference = { account: "account-b", repo: "repo-b" };
  const repoBC: RepoReference = { account: "account-b", repo: "repo-c" };
  const repoCA: RepoReference = { account: "account-c", repo: "repo-a" };
  const repoCB: RepoReference = { account: "account-c", repo: "repo-b" };
  const repoCC: RepoReference = { account: "account-c", repo: "repo-c" };

  const common = {
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [],
  };

  const requests: ProvisionRequest[] = [
    { ...common, requester: repoBB },
    { ...common, requester: repoBC },
    { ...common, requester: repoBA },
    { ...common, requester: repoCB },
    { ...common, requester: repoCC },
    { ...common, requester: repoCA },
    { ...common, requester: repoAB },
    { ...common, requester: repoAC },
    { ...common, requester: repoAA },
  ];

  expect(requests.toSorted(compareProvisionRequest)).toEqual([
    { ...common, requester: repoAA },
    { ...common, requester: repoAB },
    { ...common, requester: repoAC },
    { ...common, requester: repoBA },
    { ...common, requester: repoBB },
    { ...common, requester: repoBC },
    { ...common, requester: repoCA },
    { ...common, requester: repoCB },
    { ...common, requester: repoCC },
  ]);
});

it("sorts requests by secret name", () => {
  const common = {
    requester: { account: "account-a", repo: "repo-a" },
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    secretDec: createTestSecretDec(),
    to: [],
  };

  const requests: ProvisionRequest[] = [
    { ...common, name: "SECRET_B" },
    { ...common, name: "SECRET_C" },
    { ...common, name: "SECRET_A" },
  ];

  expect(requests.toSorted(compareProvisionRequest)).toEqual([
    { ...common, name: "SECRET_A" },
    { ...common, name: "SECRET_B" },
    { ...common, name: "SECRET_C" },
  ]);
});

it("sorts requests by targets", () => {
  const common = {
    requester: { account: "account-a", repo: "repo-a" },
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
  };

  const requestA: ProvisionRequest = {
    ...common,
    to: [
      { platform: "github", type: "actions", target: { account: "account-b" } },
      { platform: "github", type: "actions", target: { account: "account-c" } },
      { platform: "github", type: "actions", target: { account: "account-a" } },
    ],
  };
  const requestB: ProvisionRequest = {
    ...common,
    to: [
      { platform: "github", type: "actions", target: { account: "account-d" } },
      { platform: "github", type: "actions", target: { account: "account-b" } },
      { platform: "github", type: "actions", target: { account: "account-c" } },
    ],
  };
  const requestC: ProvisionRequest = {
    ...common,
    to: [
      { platform: "github", type: "actions", target: { account: "account-b" } },
    ],
  };

  const requests: ProvisionRequest[] = [
    requestB,
    requestC,
    requestA,
    requestB,
    requestC,
    requestA,
  ];

  expect(requests.toSorted(compareProvisionRequest)).toEqual([
    requestA,
    requestA,
    requestB,
    requestB,
    requestC,
    requestC,
  ]);
});
