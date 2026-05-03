import type {
  GitHubActionsProvisionRequestTarget,
  GitHubCodespacesProvisionRequestTarget,
  GitHubDependabotProvisionRequestTarget,
  GitHubEnvironmentProvisionRequestTarget,
  ProvisionRequest,
  ProvisionRequestTarget,
} from "../src/provision-request.js";
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
    to: [createTestProvisionRequestTarget("actions")],
    ...result,
  };
}

export function createTestProvisionRequestTarget(
  type: "actions",
  account?: string,
  repo?: string,
): GitHubActionsProvisionRequestTarget;
export function createTestProvisionRequestTarget(
  type: "codespaces",
  account?: string,
  repo?: string,
): GitHubCodespacesProvisionRequestTarget;
export function createTestProvisionRequestTarget(
  type: "dependabot",
  account?: string,
  repo?: string,
): GitHubDependabotProvisionRequestTarget;
export function createTestProvisionRequestTarget(
  type: "environment",
  account: string,
  repo: string,
  environment: string,
): GitHubEnvironmentProvisionRequestTarget;
export function createTestProvisionRequestTarget(
  type: ProvisionRequestTarget["type"],
  account = "account-a",
  repo?: string,
  environment?: string,
): ProvisionRequestTarget {
  if (type === "environment") {
    if (!repo || !environment) throw new Error("Missing repo or environment");

    return {
      platform: "github",
      type: "environment",
      target: { account, repo, environment },
    };
  }

  return {
    platform: "github",
    type,
    target: repo ? { account, repo } : { account },
  };
}
