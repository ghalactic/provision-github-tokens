export type ProvisionRequest =
  | GitHubActionsProvisionRequest
  | GitHubCodespacesProvisionRequest
  | GitHubDependabotProvisionRequest
  | GitHubEnvironmentProvisionRequest;

export type GitHubActionsProvisionRequest = GitHubProvisionRequestCommon & {
  type: "actions";
  repo?: string;
};

export type GitHubCodespacesProvisionRequest = GitHubProvisionRequestCommon & {
  type: "codespaces";
  repo?: string;
};

export type GitHubDependabotProvisionRequest = GitHubProvisionRequestCommon & {
  type: "dependabot";
  repo?: string;
};

export type GitHubEnvironmentProvisionRequest = GitHubProvisionRequestCommon & {
  type: "environment";
  repo: string;
  environment: string;
};

type GitHubProvisionRequestCommon = ProvisionRequestCommon & {
  platform: "github";
  account: string;
};

type ProvisionRequestCommon = {
  name: string;
};
