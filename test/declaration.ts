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
    account?: SecretDeclarationGitHubAccountSecretTypes;
    accounts?: Record<string, SecretDeclarationGitHubAccountSecretTypes>;
    repo?: Partial<SecretDeclarationGitHubRepoSecretTypes>;
    repos?: Record<string, Partial<SecretDeclarationGitHubRepoSecretTypes>>;
  };
};

export function createTestSecretDec(
  secretDec: PartialSecretDeclaration = {},
): SecretDeclaration {
  const createRepoTypes = (
    types: Partial<SecretDeclarationGitHubRepoSecretTypes>,
  ) => ({ environments: [], ...types });

  return {
    token: secretDec.token ?? "account-a/repo-a.tokenA",
    github: {
      account: secretDec.github?.account ?? {},
      accounts: secretDec.github?.accounts ?? {},
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
