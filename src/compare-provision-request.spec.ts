import { expect, it } from "vitest";
import {
  createTestAccountProvisionRequestTarget,
  createTestProvisionRequest,
} from "../test/provision-request.js";
import { compareProvisionRequest } from "./compare-provision-request.js";
import type { RepoReference } from "./github-reference.js";
import type { ProvisionRequest } from "./provision-request.js";

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
    to: [],
  };

  const requests: ProvisionRequest[] = [
    createTestProvisionRequest({ ...common, requester: repoBB }),
    createTestProvisionRequest({ ...common, requester: repoBC }),
    createTestProvisionRequest({ ...common, requester: repoBA }),
    createTestProvisionRequest({ ...common, requester: repoCB }),
    createTestProvisionRequest({ ...common, requester: repoCC }),
    createTestProvisionRequest({ ...common, requester: repoCA }),
    createTestProvisionRequest({ ...common, requester: repoAB }),
    createTestProvisionRequest({ ...common, requester: repoAC }),
    createTestProvisionRequest({ ...common, requester: repoAA }),
  ];

  expect(requests.toSorted(compareProvisionRequest)).toEqual([
    createTestProvisionRequest({ ...common, requester: repoAA }),
    createTestProvisionRequest({ ...common, requester: repoAB }),
    createTestProvisionRequest({ ...common, requester: repoAC }),
    createTestProvisionRequest({ ...common, requester: repoBA }),
    createTestProvisionRequest({ ...common, requester: repoBB }),
    createTestProvisionRequest({ ...common, requester: repoBC }),
    createTestProvisionRequest({ ...common, requester: repoCA }),
    createTestProvisionRequest({ ...common, requester: repoCB }),
    createTestProvisionRequest({ ...common, requester: repoCC }),
  ]);
});

it("sorts requests by secret name", () => {
  const common = {
    tokenDec: undefined,
    tokenDecIsRegistered: false,
    to: [],
  };

  const requests: ProvisionRequest[] = [
    createTestProvisionRequest({ ...common, name: "SECRET_B" }),
    createTestProvisionRequest({ ...common, name: "SECRET_C" }),
    createTestProvisionRequest({ ...common, name: "SECRET_A" }),
  ];

  expect(requests.toSorted(compareProvisionRequest)).toEqual([
    createTestProvisionRequest({ ...common, name: "SECRET_A" }),
    createTestProvisionRequest({ ...common, name: "SECRET_B" }),
    createTestProvisionRequest({ ...common, name: "SECRET_C" }),
  ]);
});

it("sorts requests by targets", () => {
  const common = {
    tokenDec: undefined,
    tokenDecIsRegistered: false,
  };

  const requestA: ProvisionRequest = createTestProvisionRequest({
    ...common,
    to: [
      createTestAccountProvisionRequestTarget("actions", "account-b"),
      createTestAccountProvisionRequestTarget("actions", "account-c"),
      createTestAccountProvisionRequestTarget("actions", "account-a"),
    ],
  });
  const requestB: ProvisionRequest = createTestProvisionRequest({
    ...common,
    to: [
      createTestAccountProvisionRequestTarget("actions", "account-d"),
      createTestAccountProvisionRequestTarget("actions", "account-b"),
      createTestAccountProvisionRequestTarget("actions", "account-c"),
    ],
  });
  const requestC: ProvisionRequest = createTestProvisionRequest({
    ...common,
    to: [createTestAccountProvisionRequestTarget("actions", "account-b")],
  });

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
