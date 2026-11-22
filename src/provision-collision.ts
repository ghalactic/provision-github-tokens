import stringify from "fast-json-stable-stringify";
import { compareRef } from "./compare-ref.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "./provision-request.js";
import { tokenShapeKey } from "./token-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
  ProvisionCollisionParticipant,
} from "./type/provision-auth-result.js";

export function resolveProvisionCollisions(
  authResults: ProvisionAuthResult[],
): void {
  for (const group of collisionGroups(authResults)) {
    const writable = group.filter(({ auth }) => auth.isAllowed);

    if (writable.length < 2) continue;
    if (isIdentical(writable)) continue;

    for (const entry of writable) {
      entry.target.collision = {
        isBlocking: true,
        participants: group
          .filter((other) => other !== entry)
          .map(toParticipant)
          .sort(compareParticipants),
      };
    }
  }
}

function collisionGroups(
  authResults: ProvisionAuthResult[],
): CollisionEntry[][] {
  const groups = new Map<string, CollisionEntry[]>();

  for (const auth of authResults) {
    for (const target of auth.results) {
      const key = collisionKey(auth.request.name, target.target);
      const group = groups.get(key);

      if (group) {
        group.push({ auth, target });
      } else {
        groups.set(key, [{ auth, target }]);
      }
    }
  }

  return Array.from(groups.values()).filter((group) => group.length > 1);
}

function collisionKey(name: string, target: ProvisionRequestTarget): string {
  return stringify({
    name: name.toLowerCase(),
    target: target.target,
    type: target.type,
  });
}

function isIdentical(entries: CollisionEntry[]): boolean {
  const first = writeDescriptor(entries[0]);

  return entries.every((entry) => {
    const other = writeDescriptor(entry);

    return other !== undefined && other === first;
  });
}

function writeDescriptor(entry: CollisionEntry): string | undefined {
  const { auth, target } = entry;
  const tokenRequest = target.tokenAuthResult?.request;

  if (!tokenRequest) return undefined;

  return stringify({
    name: auth.request.name,
    token: tokenShapeKey(tokenRequest),
    visibility: visibilityDescriptor(target.target),
  });
}

function visibilityDescriptor(
  target: ProvisionRequestTarget,
): string | { category: "selected"; repos: number[] } | undefined {
  if (isRepoProvisionRequestTarget(target)) return undefined;

  const { visibility } = target;

  if (visibility === "all" || visibility === "private") return visibility;

  return {
    category: "selected",
    repos: visibility.repos.map(({ id }) => id).toSorted((a, b) => a - b),
  };
}

function toParticipant({
  auth,
}: CollisionEntry): ProvisionCollisionParticipant {
  const { requester, name, secretDec } = auth.request;

  return { requester, name, token: secretDec.token };
}

function compareParticipants(
  a: ProvisionCollisionParticipant,
  b: ProvisionCollisionParticipant,
): number {
  return compareRef(a.requester, b.requester) || a.name.localeCompare(b.name);
}

type CollisionEntry = {
  auth: ProvisionAuthResult;
  target: ProvisionAuthTargetResult;
};
