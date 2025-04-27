import type {
  SecretDeclaration,
  SecretDeclarationGitHubAccountSecretTypes,
  SecretDeclarationGitHubRepoSecretTypes,
} from "../src/type/secret-declaration.js";
import type { TokenDeclaration } from "../src/type/token-declaration.js";

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

export function createTestSecretDec(
  secretDec: Partial<SecretDeclaration> = {},
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
    token: "token-a",
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
