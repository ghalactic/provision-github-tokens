import type {
  GitHubEnvironmentProvisionRequestTarget,
  GitHubRepoProvisionRequestTarget,
  ProvisionRequest,
  ProvisionRequestTarget,
} from "../src/provision-request.js";
import type { Visibility } from "../src/type/visibility.js";
import { createTestSecretDec, createTestTokenDec } from "./declaration.js";

export function createTestProvisionRequest(
  result: Partial<ProvisionRequest> = {},
): ProvisionRequest {
  return {
    requester: { account: "account-a", repo: "repo-a" },
    tokenDec: createTestTokenDec(),
    tokenDecIsRegistered: true,
    secretDec: createTestSecretDec(),
    name: "SECRET_A",
    to: [createTestAccountProvisionRequestTarget("actions", "account-a")],
    ...result,
  };
}

export function createTestAccountProvisionRequestTarget(
  type: "actions" | "agents" | "codespaces" | "dependabot",
  account: string,
): ProvisionRequestTarget {
  return { platform: "github", type, target: { account } };
}

export function createTestRepoProvisionRequestTarget(
  type: "actions" | "agents" | "codespaces" | "dependabot",
  account: string,
  repo: string,
  visibility: Visibility,
): GitHubRepoProvisionRequestTarget {
  return {
    platform: "github",
    type,
    target: { account, repo },
    visibility,
  };
}

export function createTestEnvironmentProvisionRequestTarget(
  account: string,
  repo: string,
  environment: string,
  visibility: Visibility,
): GitHubEnvironmentProvisionRequestTarget {
  return {
    platform: "github",
    type: "environment",
    target: { account, repo, environment },
    visibility,
  };
}
