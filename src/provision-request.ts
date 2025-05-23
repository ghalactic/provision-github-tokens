import { warning } from "@actions/core";
import type { AppRegistry } from "./app-registry.js";
import type { EnvironmentResolver } from "./environment-resolver.js";
import {
  repoRefToString,
  type AccountOrRepoReference,
  type EnvironmentReference,
  type RepoReference,
} from "./github-reference.js";
import { createNamePattern } from "./name-pattern.js";
import type { TokenDeclarationRegistry } from "./token-declaration-registry.js";
import type { TokenDeclaration } from "./token-declaration.js";
import type {
  SecretDeclaration,
  SecretDeclarationGitHubAccountSecretTypes,
  SecretDeclarationGitHubRepoSecretTypes,
} from "./type/secret-declaration.js";

export type ProvisionRequest = {
  requester: RepoReference;
  tokenDec: TokenDeclaration;
  secretDec: SecretDeclaration;
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

// TODO: stop returning undefined
export type ProvisionRequestFactory = (
  requester: RepoReference,
  name: string,
  secretDec: SecretDeclaration,
) => Promise<ProvisionRequest | undefined>;

export function createProvisionRequestFactory(
  declarationRegistry: TokenDeclarationRegistry,
  appRegistry: AppRegistry,
  environmentResolver: EnvironmentResolver,
): ProvisionRequestFactory {
  return async (requester, name, secretDec) => {
    const [tokenDec, isRegistered] =
      declarationRegistry.findDeclarationForRequester(
        requester,
        secretDec.token,
      );

    // TODO: roll into provision authorizer, stop returning undefined
    if (!tokenDec) {
      if (isRegistered) {
        warning(
          `Token ${secretDec.token} ` +
            `cannot be used from ${repoRefToString(requester)}`,
        );
      } else {
        warning(`Undefined token ${secretDec.token}`);
      }

      return undefined;
    }

    const platform = "github";
    const targets: ProvisionRequestTarget[] = [];

    const addAccountTargets = (
      types: SecretDeclarationGitHubAccountSecretTypes,
      accounts: string[],
    ) => {
      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (!types[type]) continue;

        for (const account of accounts) {
          targets.push({ platform, type, target: { account } });
        }
      }
    };

    const addRepoTargets = async (
      types: SecretDeclarationGitHubRepoSecretTypes,
      repos: RepoReference[],
    ) => {
      for (const type of ["actions", "codespaces", "dependabot"] as const) {
        if (!types[type]) continue;

        for (const repo of repos) {
          targets.push({ platform, type, target: repo });
        }
      }

      if (types.environments.length > 0) {
        const envs = await environmentResolver.resolveEnvironments(
          requester,
          types.environments.map(createNamePattern),
        );

        for (const environment of envs) {
          targets.push({
            platform,
            type: "environment",
            target: { ...requester, environment },
          });
        }
      }
    };

    addAccountTargets(secretDec.github.account, [requester.account]);

    for (const accountPattern in secretDec.github.accounts) {
      addAccountTargets(
        secretDec.github.accounts[accountPattern],
        appRegistry.resolveProvisionerAccounts([
          createNamePattern(accountPattern),
        ]),
      );
    }

    await addRepoTargets(secretDec.github.repo, [requester]);

    return {
      requester,
      name,
      secretDec,
      tokenDec,
      to: targets,
    };
  };
}
