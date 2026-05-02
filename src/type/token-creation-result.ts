import type { RequestError } from "@octokit/request-error";
import type { InstallationToken } from "./github-api.js";
import type { TokenAuthResult } from "./token-auth-result.js";

export type TokenCreationResultExplainer<T> = (
  authResult: TokenAuthResult,
  creationResult: TokenCreationResult,
) => T;

export type TokenCreationResult =
  | TokenCreationNotAllowedResult
  | TokenCreationNoIssuerResult
  | TokenCreationCreatedResult
  | TokenCreationRequestErrorResult
  | TokenCreationErrorResult;

export type TokenCreationNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type TokenCreationNoIssuerResult = {
  type: "NO_ISSUER";
};

export type TokenCreationCreatedResult = {
  type: "CREATED";
  token: InstallationToken;
};

export type TokenCreationRequestErrorResult = {
  type: "REQUEST_ERROR";
  error: RequestError;
};

export type TokenCreationErrorResult = {
  type: "ERROR";
  error: unknown;
};
