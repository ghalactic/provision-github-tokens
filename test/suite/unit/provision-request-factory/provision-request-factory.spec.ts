import { expect, it, vi } from "vitest";
import { createAppRegistry } from "../../../../src/app-registry.js";
import { type RepoReference } from "../../../../src/github-reference.js";
import {
  createProvisionRequestFactory,
  type ProvisionRequest,
} from "../../../../src/provision-request.js";
import { createTokenDeclarationRegistry } from "../../../../src/token-declaration-registry.js";
import { normalizeTokenReference } from "../../../../src/token-reference.js";
import {
  createTestSecretDec,
  createTestTokenDec,
} from "../../../declaration.js";
import { createTestEnvironmentResolver } from "../../../environment-resolver.js";

vi.mock("@actions/core");

it("creates provision requests from secret declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: true });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoA, "SECRET_A", secretDecA),
  ).toStrictEqual({
    requester: repoA,
    name: "SECRET_A",
    secretDec: secretDecA,
    tokenDec: tokenDecA,
    to: [],
  } satisfies ProvisionRequest);
  expect(
    await createProvisionRequest(repoX, "SECRET_X", secretDecA),
  ).toStrictEqual({
    requester: repoX,
    name: "SECRET_X",
    secretDec: secretDecA,
    tokenDec: tokenDecA,
    to: [],
  } satisfies ProvisionRequest);
});

// TODO: Test all targets together
it.todo("supports provisioning to multiple targets");

it("returns undefined for unshared token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };
  const repoX: RepoReference = { account: "account-x", repo: "repo-x" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const tokenDecA = createTestTokenDec({ shared: false });
  declarationRegistry.registerDeclaration(repoA, "token-a", tokenDecA);

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoX, "SECRET_A", secretDecA),
  ).toBeUndefined();
});

it("returns undefined for unknown token declarations", async () => {
  const repoA: RepoReference = { account: "account-a", repo: "repo-a" };

  const declarationRegistry = createTokenDeclarationRegistry();
  const appRegistry = createAppRegistry();
  const environmentResolver = createTestEnvironmentResolver();
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );

  const secretDecA = createTestSecretDec({
    token: normalizeTokenReference(repoA, "token-a"),
  });

  expect(
    await createProvisionRequest(repoA, "SECRET_A", secretDecA),
  ).toBeUndefined();
});
