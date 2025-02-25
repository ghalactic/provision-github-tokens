import type { SecretDeclaration } from "./secret-declaration.js";
import type { TokenDeclaration } from "./token-declaration.js";

export type PartialConsumerConfig = {
  $schema: string;
  tokens: Record<string, TokenDeclaration>;
  provision: {
    secrets: Record<string, SecretDeclaration>;
  };
};

export type ConsumerConfig = PartialConsumerConfig & {
  tokens: Record<string, TokenDeclaration & { account: string }>;
};
