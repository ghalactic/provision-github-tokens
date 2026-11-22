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
} from "./type/provision-auth-result.js";
import type { ProvisionConflictParticipant } from "./type/provision-conflict.js";

export function resolveProvisionConflicts(
  authResults: ProvisionAuthResult[],
): void {
  const resolutions: ConflictResolution[] = [];

  for (const group of conflictGroups(authResults)) {
    const allowed: ConflictEntry[] = [];

    for (const entry of group) {
      if (entry.auth.isAllowed) allowed.push(entry);
    }

    const areAllowedIdentical = allowed.length < 2 || isIdentical(allowed);
    const isGroupIdentical = isIdentical(group);

    for (const entry of group) {
      const isAllowed = entry.auth.isAllowed;

      if (isAllowed ? areAllowedIdentical : isGroupIdentical) continue;

      resolutions.push({
        entry,
        isAllowed,
        participants: participantsFor(entry, group),
      });
    }
  }

  for (const { entry, isAllowed, participants } of resolutions) {
    entry.target.conflict = { participants };

    if (!isAllowed) continue;

    entry.target.isAllowed = false;
    entry.auth.isAllowed = false;
  }
}

function conflictGroups(authResults: ProvisionAuthResult[]): ConflictEntry[][] {
  const groups = new Map<string, ConflictEntry[]>();

  for (const auth of authResults) {
    for (const target of auth.results) {
      const key = conflictKey(auth.request.name, target.target);
      const group = groups.get(key);

      if (group) {
        group.push({ auth, target });
      } else {
        groups.set(key, [{ auth, target }]);
      }
    }
  }

  const conflicts: ConflictEntry[][] = [];

  for (const group of groups.values()) {
    if (group.length > 1) conflicts.push(group);
  }

  return conflicts;
}

function conflictKey(name: string, target: ProvisionRequestTarget): string {
  return stringify({
    name: name.toLowerCase(),
    target: target.target,
    type: target.type,
  });
}

function isIdentical(entries: ConflictEntry[]): boolean {
  const first = writeDescriptor(entries[0]);

  for (const entry of entries) {
    const other = writeDescriptor(entry);

    if (other == null || other !== first) return false;
  }

  return true;
}

function writeDescriptor(entry: ConflictEntry): string | undefined {
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

function toParticipant({ auth }: ConflictEntry): ProvisionConflictParticipant {
  const { requester, name, secretDec } = auth.request;

  return { requester, name, token: secretDec.token };
}

function participantsFor(
  entry: ConflictEntry,
  group: ConflictEntry[],
): ProvisionConflictParticipant[] {
  const participants: ProvisionConflictParticipant[] = [];

  for (const other of group) {
    if (other !== entry) participants.push(toParticipant(other));
  }

  participants.sort(compareParticipants);

  return participants;
}

function compareParticipants(
  a: ProvisionConflictParticipant,
  b: ProvisionConflictParticipant,
): number {
  return compareRef(a.requester, b.requester) || a.name.localeCompare(b.name);
}

type ConflictEntry = {
  auth: ProvisionAuthResult;
  target: ProvisionAuthTargetResult;
};

type ConflictResolution = {
  entry: ConflictEntry;
  isAllowed: boolean;
  participants: ProvisionConflictParticipant[];
};
