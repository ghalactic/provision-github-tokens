import type {
  AccountOrRepoReference,
  EnvironmentReference,
  RepoReference,
} from "../github-reference.js";

export type ProvisionRequest =
  | GitHubActionsProvisionRequest
  | GitHubCodespacesProvisionRequest
  | GitHubDependabotProvisionRequest
  | GitHubEnvironmentProvisionRequest;

export type GitHubActionsProvisionRequest = GitHubProvisionRequestCommon & {
  type: "actions";
  target: AccountOrRepoReference;
};

export type GitHubCodespacesProvisionRequest = GitHubProvisionRequestCommon & {
  type: "codespaces";
  target: AccountOrRepoReference;
};

export type GitHubDependabotProvisionRequest = GitHubProvisionRequestCommon & {
  type: "dependabot";
  target: AccountOrRepoReference;
};

export type GitHubEnvironmentProvisionRequest = GitHubProvisionRequestCommon & {
  type: "environment";
  target: EnvironmentReference;
};

type GitHubProvisionRequestCommon = ProvisionRequestCommon & {
  platform: "github";
};

type ProvisionRequestCommon = {
  requester: RepoReference;
  name: string;
};
