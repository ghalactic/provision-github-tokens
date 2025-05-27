import { compareRef } from "./compare-ref.js";
import type { ProvisionRequestTarget } from "./provision-request.js";

export function compareProvisionRequestTarget(
  a: ProvisionRequestTarget,
  b: ProvisionRequestTarget,
): number {
  const targetCompare = compareRef(a.target, b.target);
  if (targetCompare !== 0) return targetCompare;

  return a.type.localeCompare(b.type);
}
