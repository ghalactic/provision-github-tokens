import type { TokenDeclaration } from "../token-declaration.js";
import type { SecretDeclaration } from "./secret-declaration.js";

export type PartialRequesterConfig = {
  $schema: string;
  tokens: Record<string, TokenDeclaration>;
  provision: {
    secrets: Record<string, SecretDeclaration>;
  };
};

export type RequesterConfig = PartialRequesterConfig & {
  tokens: Record<string, TokenDeclaration & { account: string }>;
};
