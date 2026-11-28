import { type RequestError } from "@octokit/request-error";
import type { InstallationRegistration } from "../app-registry.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./provision-auth-result.js";

export type ProvisionResultExplainer<T> = (
  authResult: ProvisionAuthResult,
  targetResults: Map<ProvisionAuthTargetResult, ProvisionResult>,
) => T;

export type ProvisionResult =
  | ProvisionNotAllowedResult
  | ProvisionNoTokenResult
  | ProvisionNoProvisionerResult
  | ProvisionProvisionedResult
  | ProvisionFailedResult;

export type ProvisionNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type ProvisionNoTokenResult = {
  type: "NO_TOKEN";
};

export type ProvisionNoProvisionerResult = {
  type: "NO_PROVISIONER";
};

export type ProvisionProvisionedResult = {
  type: "PROVISIONED";
  provisioner: InstallationRegistration;
  failedAttempts: ProvisionAttempt[];
};

export type ProvisionFailedResult = {
  type: "FAILED";
  attempts: ProvisionAttempt[];
};

export type ProvisionAttempt =
  | ProvisionRequestErrorAttempt
  | ProvisionErrorAttempt;

export type ProvisionRequestErrorAttempt = {
  type: "REQUEST_ERROR";
  provisioner: InstallationRegistration;
  error: RequestError;
};

export type ProvisionErrorAttempt = {
  type: "ERROR";
  provisioner: InstallationRegistration;
  error: unknown;
};
