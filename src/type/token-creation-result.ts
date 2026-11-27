import type { RequestError } from "@octokit/request-error";
import type { InstallationRegistration } from "../app-registry.js";
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
  | TokenCreationFailedResult;

export type TokenCreationNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type TokenCreationNoIssuerResult = {
  type: "NO_ISSUER";
};

export type TokenCreationCreatedResult = {
  type: "CREATED";
  token: InstallationToken;
  issuer: InstallationRegistration;
  failedAttempts: TokenCreationAttempt[];
};

export type TokenCreationFailedResult = {
  type: "FAILED";
  attempts: TokenCreationAttempt[];
};

export type TokenCreationAttempt =
  | TokenCreationRequestErrorAttempt
  | TokenCreationErrorAttempt;

export type TokenCreationRequestErrorAttempt = {
  type: "REQUEST_ERROR";
  issuer: InstallationRegistration;
  error: RequestError;
};

export type TokenCreationErrorAttempt = {
  type: "ERROR";
  issuer: InstallationRegistration;
  error: unknown;
};
