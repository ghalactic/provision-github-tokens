import stringify from "fast-json-stable-stringify";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "./provision-request.js";
import { tokenShapeKey, type TokenRequest } from "./token-request.js";

/**
 * Identifies the secret slot a provision request writes to: the target and the
 * secret name, compared the way GitHub compares names.
 */
export function provisionSecretKey(
  name: string,
  target: ProvisionRequestTarget,
): string {
  return stringify({
    name: name.toLowerCase(),
    target: target.target,
    type: target.type,
  });
}

/**
 * Identifies exactly what a provision request writes, so identical declarations
 * share a write. Undefined when the token declaration is unknown, because its
 * content is unknown.
 */
export function provisionWriteKey(
  name: string,
  target: ProvisionRequestTarget,
  tokenRequest: TokenRequest,
): string;
export function provisionWriteKey(
  name: string,
  target: ProvisionRequestTarget,
  tokenRequest: TokenRequest | undefined,
): string | undefined;
export function provisionWriteKey(
  name: string,
  target: ProvisionRequestTarget,
  tokenRequest: TokenRequest | undefined,
): string | undefined {
  if (!tokenRequest) return undefined;

  return stringify({
    name,
    target: target.target,
    type: target.type,
    token: tokenShapeKey(tokenRequest),
    visibility: visibilityDescriptor(target),
  });
}

function visibilityDescriptor(
  target: ProvisionRequestTarget,
): string | { category: "selected"; repos: number[] } | undefined {
  if (isRepoProvisionRequestTarget(target)) return undefined;

  const { visibility } = target;

  if (visibility === "all" || visibility === "private") return visibility;

  const repos: number[] = [];

  for (const { id } of visibility.repos) repos.push(id);

  repos.sort((a, b) => a - b);

  return { category: "selected", repos };
}
