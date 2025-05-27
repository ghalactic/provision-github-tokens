import { repoRefToString, type RepoReference } from "./github-reference.js";
import type { TokenDeclaration } from "./token-declaration.js";

export type TokenDeclarationRegistry = {
  registerDeclaration: (
    definingRepo: RepoReference,
    name: string,
    declaration: TokenDeclaration,
  ) => void;

  findDeclarationForRequester: (
    requester: RepoReference,
    reference: string,
  ) => [declaration: TokenDeclaration | undefined, isRegistered: boolean];
};

export function createTokenDeclarationRegistry(): TokenDeclarationRegistry {
  const declarations = new Map<string, TokenDeclaration>();

  return {
    registerDeclaration(definingRepo, name, declaration) {
      declarations.set(`${repoRefToString(definingRepo)}.${name}`, declaration);
    },

    findDeclarationForRequester(requester, reference) {
      const declaration = declarations.get(reference);

      if (!declaration) return [undefined, false];
      if (declaration.shared) return [declaration, true];

      return reference.startsWith(`${repoRefToString(requester)}.`)
        ? [declaration, true]
        : [undefined, true];
    },
  };
}
