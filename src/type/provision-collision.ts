import type { RepoReference } from "../github-reference.js";

export type ProvisionCollision = {
  participants: ProvisionCollisionParticipant[];
};

export type ProvisionCollisionParticipant = {
  requester: RepoReference;
  name: string;
  token: string;
};
