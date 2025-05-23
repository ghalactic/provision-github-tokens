import type { AppRegistry } from "./app-registry.js";
import type { EnvironmentResolver } from "./environment-resolver.js";
import { createGitHubPattern } from "./github-pattern.js";
import {
  createEnvRef,
  repoRefFromName,
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

const SECRET_TYPES = ["actions", "codespaces", "dependabot"] as const;

export type ProvisionRequest = {
  requester: RepoReference;
  tokenDec: TokenDeclaration | undefined;
  tokenDecIsRegistered: boolean;
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

export type ProvisionRequestFactory = (
  requester: RepoReference,
  name: string,
  secretDec: SecretDeclaration,
) => Promise<ProvisionRequest>;

export function createProvisionRequestFactory(
  declarationRegistry: TokenDeclarationRegistry,
  appRegistry: AppRegistry,
  environmentResolver: EnvironmentResolver,
): ProvisionRequestFactory {
  return async (requester, name, secretDec) => {
    const [tokenDec, tokenDecIsRegistered] =
      declarationRegistry.findDeclarationForRequester(
        requester,
        secretDec.token,
      );

    const typesByAccount: Record<
      string,
      SecretDeclarationGitHubAccountSecretTypes
    > = {};

    for (const accountPattern in secretDec.github.accounts) {
      const accounts = appRegistry.resolveProvisionerAccounts([
        createNamePattern(accountPattern),
      ]);
      const patternTypes = secretDec.github.accounts[accountPattern];

      for (const account of accounts) {
        combineTypes((typesByAccount[account] ??= {}), patternTypes);
      }
    }

    // Self-account types take precedence over pattern-matched types
    overrideTypes(
      (typesByAccount[requester.account] ??= {}),
      secretDec.github.account,
    );

    const typesByRepo: Record<string, SecretDeclarationGitHubRepoSecretTypes> =
      {};

    for (const repoPattern in secretDec.github.repos) {
      const repos = appRegistry
        .resolveProvisionerRepos([createGitHubPattern(repoPattern)])
        .map(repoRefFromName);
      const patternTypes = secretDec.github.repos[repoPattern];

      for (const repo of repos) {
        const repoName = repoRefToString(repo);

        let types = typesByRepo[repoName];
        const isFirstRepo = !types;
        typesByRepo[repoName] = types ??= { environments: [] };

        combineTypes(types, patternTypes);

        const envs =
          patternTypes.environments.length > 0
            ? await environmentResolver.resolveEnvironments(
                repo,
                patternTypes.environments.map(createNamePattern),
              )
            : [];

        if (isFirstRepo) {
          types.environments = envs;
        } else {
          // The environments are the intersection of all matching patterns. In
          // other words, if one pattern has an environment and another doesn't,
          // the environment is not included.
          types.environments = types.environments.filter((env) =>
            envs.includes(env),
          );
        }
      }
    }

    const selfRepoTypes = (typesByRepo[repoRefToString(requester)] ??= {
      environments: [],
    });

    // Self-repo types take precedence over pattern-matched types
    overrideTypes(selfRepoTypes, secretDec.github.repo);

    // Self-repo environments add to any pattern-matched environments
    if (secretDec.github.repo.environments.length > 0) {
      const envs = await environmentResolver.resolveEnvironments(
        requester,
        secretDec.github.repo.environments.map(createNamePattern),
      );

      selfRepoTypes.environments.push(
        ...envs.filter((env) => !selfRepoTypes.environments.includes(env)),
      );
    }

    const platform = "github";
    const targets: ProvisionRequestTarget[] = [];

    for (const account in typesByAccount) {
      const types = typesByAccount[account];

      for (const type of SECRET_TYPES) {
        if (types[type]) targets.push({ platform, type, target: { account } });
      }
    }

    for (const repoName in typesByRepo) {
      const types = typesByRepo[repoName];
      const repo = repoRefFromName(repoName);

      for (const type of SECRET_TYPES) {
        if (types[type]) targets.push({ platform, type, target: repo });
      }

      for (const env of types.environments) {
        targets.push({
          platform,
          type: "environment",
          target: createEnvRef(repo.account, repo.repo, env),
        });
      }
    }

    return {
      requester,
      name,
      secretDec,
      tokenDec,
      tokenDecIsRegistered,
      to: targets,
    };
  };

  function combineTypes(
    base: SecretDeclarationGitHubAccountSecretTypes,
    additions: SecretDeclarationGitHubAccountSecretTypes,
  ): void {
    for (const type of SECRET_TYPES) {
      if (base[type] !== false && additions[type] != null) {
        base[type] = additions[type];
      }
    }
  }

  function overrideTypes(
    base: SecretDeclarationGitHubAccountSecretTypes,
    additions: SecretDeclarationGitHubAccountSecretTypes,
  ): void {
    for (const type of SECRET_TYPES) {
      if (additions[type] != null) base[type] = additions[type];
    }
  }
}
