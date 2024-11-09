import type { TokenDeclaration } from "./type/token-declaration.js";

export type TokenDeclarationRegistry = {
  registerDeclaration: (
    definingAccount: string,
    definingRepo: string,
    name: string,
    declaration: TokenDeclaration,
  ) => void;

  findDeclarationForRequester: (
    requestingAccount: string,
    requestingRepo: string,
    reference: string,
  ) => [declaration: TokenDeclaration | undefined, isRegistered: boolean];
};

export function createTokenDeclarationRegistry(): TokenDeclarationRegistry {
  const declarations = new Map<string, TokenDeclaration>();

  return {
    registerDeclaration(definingAccount, definingRepo, name, declaration) {
      declarations.set(
        `${definingAccount}/${definingRepo}.${name}`,
        declaration,
      );
    },

    findDeclarationForRequester(requestingAccount, requestingRepo, reference) {
      const declaration = declarations.get(reference);

      if (!declaration) return [undefined, false];
      if (declaration.shared) return [declaration, true];

      const requiredPrefix = `${requestingAccount}/${requestingRepo}.`;

      return reference.startsWith(requiredPrefix)
        ? [declaration, true]
        : [undefined, true];
    },
  };
}
