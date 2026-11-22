import { type RequestError } from "@octokit/request-error";
import type { ProvisionCollision } from "../provision-collision.js";
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
  | ProvisionCollisionResult
  | ProvisionProvisionedResult
  | ProvisionRequestErrorResult
  | ProvisionErrorResult;

export type ProvisionNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type ProvisionNoTokenResult = {
  type: "NO_TOKEN";
};

export type ProvisionNoProvisionerResult = {
  type: "NO_PROVISIONER";
};

export type ProvisionCollisionResult = {
  type: "COLLISION";
  collision: ProvisionCollision;
};

export type ProvisionProvisionedResult = {
  type: "PROVISIONED";
};

export type ProvisionRequestErrorResult = {
  type: "REQUEST_ERROR";
  error: RequestError;
};

export type ProvisionErrorResult = {
  type: "ERROR";
  error: unknown;
};
