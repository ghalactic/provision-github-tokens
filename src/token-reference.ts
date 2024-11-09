export function normalizeTokenReference(
  definingOwner: string,
  definingRepo: string,
  reference: string,
): string {
  const dotIdx = reference.lastIndexOf(".");

  if (dotIdx === -1) return `${definingOwner}/${definingRepo}.${reference}`;

  const name = reference.slice(dotIdx + 1);
  const referenceOwnerRepo = reference.slice(0, dotIdx);
  const slashIdx = referenceOwnerRepo.indexOf("/");
  const owner =
    slashIdx === -1 ? definingOwner : referenceOwnerRepo.slice(0, slashIdx);
  const repo =
    slashIdx === -1
      ? referenceOwnerRepo
      : referenceOwnerRepo.slice(slashIdx + 1);

  return `${owner}/${repo}.${name}`;
}
