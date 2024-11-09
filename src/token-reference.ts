export function normalizeTokenReference(
  definingAccount: string,
  definingRepo: string,
  reference: string,
): string {
  const dotIdx = reference.lastIndexOf(".");

  if (dotIdx === -1) return `${definingAccount}/${definingRepo}.${reference}`;

  const name = reference.slice(dotIdx + 1);
  const referenceAccountRepo = reference.slice(0, dotIdx);
  const slashIdx = referenceAccountRepo.indexOf("/");
  const account =
    slashIdx === -1 ? definingAccount : referenceAccountRepo.slice(0, slashIdx);
  const repo =
    slashIdx === -1
      ? referenceAccountRepo
      : referenceAccountRepo.slice(slashIdx + 1);

  return `${account}/${repo}.${name}`;
}
