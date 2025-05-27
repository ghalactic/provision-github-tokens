import { expect, it } from "vitest";
import { compareTokenRequest } from "../../../src/compare-token-request.js";
import type {
  AccountReference,
  RepoReference,
} from "../../../src/github-reference.js";
import type { TokenRequest } from "../../../src/token-request.js";
import { createTestTokenDec } from "../../declaration.js";

it("sorts requests by the consumer", () => {
  const accountA: AccountReference = { account: "account-a" };
  const accountB: AccountReference = { account: "account-b" };
  const accountC: AccountReference = { account: "account-c" };

  const repoAA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoAB: RepoReference = { account: "account-a", repo: "repo-b" };
  const repoAC: RepoReference = { account: "account-a", repo: "repo-c" };
  const repoBA: RepoReference = { account: "account-b", repo: "repo-a" };
  const repoBB: RepoReference = { account: "account-b", repo: "repo-b" };
  const repoBC: RepoReference = { account: "account-b", repo: "repo-c" };
  const repoCA: RepoReference = { account: "account-c", repo: "repo-a" };
  const repoCB: RepoReference = { account: "account-c", repo: "repo-b" };
  const repoCC: RepoReference = { account: "account-c", repo: "repo-c" };

  const tokenDec = createTestTokenDec({ permissions: { metadata: "read" } });

  const requests: TokenRequest[] = [
    { consumer: repoBB, tokenDec, repos: "all" },
    { consumer: repoBC, tokenDec, repos: "all" },
    { consumer: repoBA, tokenDec, repos: "all" },
    { consumer: accountB, tokenDec, repos: "all" },
    { consumer: repoCB, tokenDec, repos: "all" },
    { consumer: repoCC, tokenDec, repos: "all" },
    { consumer: repoCA, tokenDec, repos: "all" },
    { consumer: accountC, tokenDec, repos: "all" },
    { consumer: repoAB, tokenDec, repos: "all" },
    { consumer: repoAC, tokenDec, repos: "all" },
    { consumer: repoAA, tokenDec, repos: "all" },
    { consumer: accountA, tokenDec, repos: "all" },
  ];

  expect(requests.toSorted(compareTokenRequest)).toEqual([
    { consumer: accountA, tokenDec, repos: "all" },
    { consumer: repoAA, tokenDec, repos: "all" },
    { consumer: repoAB, tokenDec, repos: "all" },
    { consumer: repoAC, tokenDec, repos: "all" },
    { consumer: accountB, tokenDec, repos: "all" },
    { consumer: repoBA, tokenDec, repos: "all" },
    { consumer: repoBB, tokenDec, repos: "all" },
    { consumer: repoBC, tokenDec, repos: "all" },
    { consumer: accountC, tokenDec, repos: "all" },
    { consumer: repoCA, tokenDec, repos: "all" },
    { consumer: repoCB, tokenDec, repos: "all" },
    { consumer: repoCC, tokenDec, repos: "all" },
  ]);
});

it("sorts requests by the token declaration account", () => {
  const accountA: AccountReference = { account: "account-a" };

  const tokenDecA = createTestTokenDec({ account: "account-a" });
  const tokenDecB = createTestTokenDec({ account: "account-b" });
  const tokenDecC = createTestTokenDec({ account: "account-c" });

  const requests: TokenRequest[] = [
    { consumer: accountA, tokenDec: tokenDecB, repos: "all" },
    { consumer: accountA, tokenDec: tokenDecC, repos: "all" },
    { consumer: accountA, tokenDec: tokenDecA, repos: "all" },
  ];

  expect(requests.toSorted(compareTokenRequest)).toEqual([
    { consumer: accountA, tokenDec: tokenDecA, repos: "all" },
    { consumer: accountA, tokenDec: tokenDecB, repos: "all" },
    { consumer: accountA, tokenDec: tokenDecC, repos: "all" },
  ]);
});

it("sorts requests by no repos / all repos / selected repos", () => {
  const accountA: AccountReference = { account: "account-a" };

  const requestNoRepos: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({ account: "account-a", repos: [] }),
    repos: [],
  };
  const requestAllRepos: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({ account: "account-a", repos: "all" }),
    repos: "all",
  };
  const requestSelectedRepos: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: ["repo-a", "repo-b"],
    }),
    repos: ["repo-a", "repo-b"],
  };

  const requests: TokenRequest[] = [
    requestAllRepos,
    requestSelectedRepos,
    requestNoRepos,
    requestAllRepos,
    requestSelectedRepos,
    requestNoRepos,
  ];

  expect(requests.toSorted(compareTokenRequest)).toEqual([
    requestNoRepos,
    requestNoRepos,
    requestAllRepos,
    requestAllRepos,
    requestSelectedRepos,
    requestSelectedRepos,
  ]);
});

it("sorts requests by the resolved repos", () => {
  const accountA: AccountReference = { account: "account-a" };
  const tokenDec = createTestTokenDec({ account: "account-a", repos: ["*"] });

  const requestA: TokenRequest = {
    consumer: accountA,
    tokenDec,
    repos: ["repo-b", "repo-c", "repo-a"],
  };
  const requestB: TokenRequest = {
    consumer: accountA,
    tokenDec,
    repos: ["repo-d", "repo-b", "repo-c"],
  };
  const requestC: TokenRequest = {
    consumer: accountA,
    tokenDec,
    repos: ["repo-b"],
  };

  const requests: TokenRequest[] = [requestB, requestC, requestA];

  expect(requests.toSorted(compareTokenRequest)).toEqual([
    requestA,
    requestB,
    requestC,
  ]);
});

it("sorts requests by requested permission name", () => {
  const accountA: AccountReference = { account: "account-a" };

  const requestA: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { bbb: "read", ccc: "read", aaa: "read" },
    }),
    repos: "all",
  };
  const requestB: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { ddd: "read", bbb: "read", ccc: "read" },
    }),
    repos: "all",
  };
  const requestC: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { bbb: "read" },
    }),
    repos: "all",
  };

  const requests: TokenRequest[] = [requestB, requestC, requestA];

  expect(requests.toSorted(compareTokenRequest)).toEqual([
    requestA,
    requestB,
    requestC,
  ]);
});

it("sorts requests by requested permission level", () => {
  const accountA: AccountReference = { account: "account-a" };

  const requestAdmin: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { repository_projects: "admin" },
    }),
    repos: "all",
  };
  const requestWrite: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { repository_projects: "write" },
    }),
    repos: "all",
  };
  const requestRead: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { repository_projects: "read" },
    }),
    repos: "all",
  };
  const requestNone: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: { repository_projects: "none" },
    }),
    repos: "all",
  };
  const requestMissing: TokenRequest = {
    consumer: accountA,
    tokenDec: createTestTokenDec({
      account: "account-a",
      repos: "all",
      permissions: {},
    }),
    repos: "all",
  };

  const requests: TokenRequest[] = [
    requestNone,
    requestWrite,
    requestMissing,
    requestRead,
    requestAdmin,
  ];

  expect(requests.toSorted(compareTokenRequest)).toEqual([
    requestAdmin,
    requestWrite,
    requestRead,
    requestNone,
    requestMissing,
  ]);
});
