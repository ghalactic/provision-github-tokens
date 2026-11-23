import type { RepoReference } from "../github-reference.js";

export type ProvisionConflict = {
  participants: ProvisionConflictParticipant[];
};

export type ProvisionConflictParticipant = {
  requester: RepoReference;
  name: string;
  token: string;
};
