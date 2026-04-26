// src/type/token-creation-result.ts
import type { TokenCreationResult } from "../token-factory.js";
import type { TokenAuthResult } from "./token-auth-result.js";

export type TokenCreationResultExplainer<T> = (
  authResult: TokenAuthResult,
  creationResult: TokenCreationResult,
) => T;

export type TokenCreationResultExplainerFactory<T> = (
  results: Map<TokenAuthResult, TokenCreationResult>,
) => TokenCreationResultExplainer<T>;
