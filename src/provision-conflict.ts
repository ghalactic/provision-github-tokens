import { compareRef } from "./compare-ref.js";
import { provisionTargetKey, provisionWriteKey } from "./provision-key.js";
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
      const key = provisionTargetKey(auth.request.name, target.target);
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

function isIdentical(entries: ConflictEntry[]): boolean {
  const first = writeKey(entries[0]);

  for (const entry of entries) {
    if (writeKey(entry) !== first) return false;
  }

  return first != null;
}

function writeKey({ auth, target }: ConflictEntry): string | undefined {
  return provisionWriteKey(
    auth.request.name,
    target.target,
    target.tokenAuthResult?.request,
  );
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
