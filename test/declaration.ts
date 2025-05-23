import type { TokenDeclaration } from "../src/token-declaration.js";
import type {
  SecretDeclaration,
  SecretDeclarationGitHubAccountSecretTypes,
  SecretDeclarationGitHubRepoSecretTypes,
} from "../src/type/secret-declaration.js";

export function createTestTokenDec(
  tokenDec: Partial<TokenDeclaration> = {},
): TokenDeclaration {
  return {
    shared: false,
    as: undefined,
    account: "account-a",
    repos: "all",
    permissions: { metadata: "read" },
    ...tokenDec,
  };
}

export type PartialSecretDeclaration = {
  token?: string;
  github?: {
    account?: Partial<SecretDeclarationGitHubAccountSecretTypes>;
    accounts?: Record<
      string,
      Partial<SecretDeclarationGitHubAccountSecretTypes>
    >;
    repo?: Partial<SecretDeclarationGitHubRepoSecretTypes>;
    repos?: Record<string, Partial<SecretDeclarationGitHubRepoSecretTypes>>;
  };
};

export function createTestSecretDec(
  secretDec: PartialSecretDeclaration = {},
): SecretDeclaration {
  const createAccountTypes = (
    types: Partial<SecretDeclarationGitHubAccountSecretTypes>,
  ) => ({
    actions: false,
    codespaces: false,
    dependabot: false,
    ...types,
  });

  const createRepoTypes = (
    types: Partial<SecretDeclarationGitHubRepoSecretTypes>,
  ) => ({
    actions: false,
    codespaces: false,
    dependabot: false,
    environments: [],
    ...types,
  });

  return {
    token: secretDec.token ?? "account-a/repo-a.token-a",
    github: {
      account: createAccountTypes(secretDec.github?.account ?? {}),
      accounts: Object.fromEntries(
        Object.entries(secretDec.github?.accounts ?? {}).map(
          ([account, types]) => [account, createAccountTypes(types)],
        ),
      ),
      repo: createRepoTypes(secretDec.github?.repo ?? {}),
      repos: Object.fromEntries(
        Object.entries(secretDec.github?.repos ?? {}).map(([repo, types]) => [
          repo,
          createRepoTypes(types),
        ]),
      ),
    },
  };
}
