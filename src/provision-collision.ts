import stringify from "fast-json-stable-stringify";
import { compareRef } from "./compare-ref.js";
import type { RepoReference } from "./github-reference.js";
import {
  isRepoProvisionRequestTarget,
  type ProvisionRequestTarget,
} from "./provision-request.js";
import { tokenShapeKey } from "./token-request.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";

export type ProvisionCollision = {
  isBlocking: boolean;
  participants: ProvisionCollisionParticipant[];
};

export type ProvisionCollisionParticipant = {
  requester: RepoReference;
  name: string;
  token: string;
};

export type ProvisionCollisions = Map<
  ProvisionAuthTargetResult,
  ProvisionCollision
>;

export function resolveProvisionCollisions(
  authResults: ProvisionAuthResult[],
): ProvisionCollisions {
  const collisions: ProvisionCollisions = new Map();

  for (const group of collisionGroups(authResults)) {
    const allowed: CollisionEntry[] = [];

    for (const entry of group) {
      if (entry.auth.isAllowed) allowed.push(entry);
    }

    const areAllowedIdentical = allowed.length < 2 || isIdentical(allowed);
    const isGroupIdentical = isIdentical(group);

    for (const entry of group) {
      const isBlocking = entry.auth.isAllowed;
      if (isBlocking ? areAllowedIdentical : isGroupIdentical) continue;

      collisions.set(entry.target, {
        isBlocking,
        participants: participantsFor(entry, group),
      });
    }
  }

  return collisions;
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

  const collisions: CollisionEntry[][] = [];

  for (const group of groups.values()) {
    if (group.length > 1) collisions.push(group);
  }

  return collisions;
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

  for (const entry of entries) {
    const other = writeDescriptor(entry);

    if (other == null || other !== first) return false;
  }

  return true;
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

  const repos: number[] = [];

  for (const { id } of visibility.repos) repos.push(id);

  repos.sort((a, b) => a - b);

  return { category: "selected", repos };
}

function toParticipant({
  auth,
}: CollisionEntry): ProvisionCollisionParticipant {
  const { requester, name, secretDec } = auth.request;

  return { requester, name, token: secretDec.token };
}

function participantsFor(
  entry: CollisionEntry,
  group: CollisionEntry[],
): ProvisionCollisionParticipant[] {
  const participants: ProvisionCollisionParticipant[] = [];

  for (const other of group) {
    if (other !== entry) participants.push(toParticipant(other));
  }

  participants.sort(compareParticipants);

  return participants;
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
