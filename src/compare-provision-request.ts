import { compareProvisionRequestTarget } from "./compare-provision-request-target.js";
import { compareRef } from "./compare-ref.js";
import type { ProvisionRequest } from "./provision-request.js";

export function compareProvisionRequest(
  a: ProvisionRequest,
  b: ProvisionRequest,
): number {
  const requesterCompare = compareRef(a.requester, b.requester);
  if (requesterCompare !== 0) return requesterCompare;

  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;

  const aTo = JSON.stringify(a.to.toSorted(compareProvisionRequestTarget));
  const bTo = JSON.stringify(b.to.toSorted(compareProvisionRequestTarget));
  if (aTo !== bTo) return aTo.localeCompare(bTo);

  return 0;
}
