import type { TokenDeclaration } from "./type/token-declaration.js";

export type TokenDeclarationRegistry = {
  registerDeclaration: (
    definingOwner: string,
    definingRepo: string,
    name: string,
    declaration: TokenDeclaration,
  ) => void;

  findDeclarationForRequester: (
    requestingOwner: string,
    requestingRepo: string,
    reference: string,
  ) => [declaration: TokenDeclaration | undefined, isRegistered: boolean];
};

export function createTokenDeclarationRegistry(): TokenDeclarationRegistry {
  const declarations = new Map<string, TokenDeclaration>();

  return {
    registerDeclaration(definingOwner, definingRepo, name, declaration) {
      declarations.set(`${definingOwner}/${definingRepo}.${name}`, declaration);
    },

    findDeclarationForRequester(requestingOwner, requestingRepo, reference) {
      const declaration = declarations.get(reference);

      if (!declaration) return [undefined, false];
      if (declaration.shared) return [declaration, true];

      const requiredPrefix = `${requestingOwner}/${requestingRepo}.`;

      return reference.startsWith(requiredPrefix)
        ? [declaration, true]
        : [undefined, true];
    },
  };
}
