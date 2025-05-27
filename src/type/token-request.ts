import type { AccountOrRepoReference } from "../github-reference.js";
import type { TokenDeclaration } from "../token-declaration.js";

export type TokenRequest = {
  consumer: AccountOrRepoReference;
  tokenDec: TokenDeclaration;
  repos: "all" | string[];
};
