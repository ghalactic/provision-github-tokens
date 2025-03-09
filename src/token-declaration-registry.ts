import { repoRefToString, type RepoReference } from "./github-reference.js";
import type { TokenDeclaration } from "./type/token-declaration.js";

export type TokenDeclarationRegistry = {
  registerDeclaration: (
    definingRepo: RepoReference,
    name: string,
    declaration: TokenDeclaration,
  ) => void;

  findDeclarationForRequester: (
    requestingRepo: RepoReference,
    reference: string,
  ) => [declaration: TokenDeclaration | undefined, isRegistered: boolean];
};

export function createTokenDeclarationRegistry(): TokenDeclarationRegistry {
  const declarations = new Map<string, TokenDeclaration>();

  return {
    registerDeclaration(definingRepo, name, declaration) {
      declarations.set(`${repoRefToString(definingRepo)}.${name}`, declaration);
    },

    findDeclarationForRequester(requestingRepo, reference) {
      const declaration = declarations.get(reference);

      if (!declaration) return [undefined, false];
      if (declaration.shared) return [declaration, true];

      return reference.startsWith(`${repoRefToString(requestingRepo)}.`)
        ? [declaration, true]
        : [undefined, true];
    },
  };
}
