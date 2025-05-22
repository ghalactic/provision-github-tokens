import type { Permissions } from "./type/permissions.js";

export type TokenDeclaration = {
  shared: boolean;
  as: string | undefined;
  account: string;
  repos: "all" | string[];
  permissions: Permissions;
};

export function normalizeTokenDeclaration(
  declaration: TokenDeclaration,
): TokenDeclaration {
  const { repos } = declaration;

  return { ...declaration, repos: repos === "all" ? "all" : repos.toSorted() };
}
