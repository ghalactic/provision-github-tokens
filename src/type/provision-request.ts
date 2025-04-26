import type {
  AccountOrRepoReference,
  EnvironmentReference,
  RepoReference,
} from "../github-reference.js";

export type ProvisionRequest = {
  requester: RepoReference;
  name: string;
  to: ProvisionRequestTarget[];
};

export type ProvisionRequestTarget =
  | GitHubActionsProvisionRequestTarget
  | GitHubCodespacesProvisionRequestTarget
  | GitHubDependabotProvisionRequestTarget
  | GitHubEnvironmentProvisionRequestTarget;

export type GitHubActionsProvisionRequestTarget = {
  platform: "github";
  type: "actions";
  target: AccountOrRepoReference;
};

export type GitHubCodespacesProvisionRequestTarget = {
  platform: "github";
  type: "codespaces";
  target: AccountOrRepoReference;
};

export type GitHubDependabotProvisionRequestTarget = {
  platform: "github";
  type: "dependabot";
  target: AccountOrRepoReference;
};

export type GitHubEnvironmentProvisionRequestTarget = {
  platform: "github";
  type: "environment";
  target: EnvironmentReference;
};
