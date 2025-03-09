import {
  createRepoRef,
  repoRefToString,
  type RepoReference,
} from "./github-reference.js";

export function normalizeTokenReference(
  definingRepo: RepoReference,
  reference: string,
): string {
  if (!reference) throw new Error("Token reference cannot be empty");

  const dotIdx = reference.lastIndexOf(".");

  if (dotIdx === -1) return `${repoRefToString(definingRepo)}.${reference}`;

  const namePart = reference.slice(dotIdx + 1);
  const repoParts = reference.slice(0, dotIdx).split("/");

  if (repoParts.length !== 2) {
    throw new Error(
      `Token reference ${JSON.stringify(reference)} ` +
        "repo part must contain exactly one slash",
    );
  }

  const [accountPart, repoPart] = repoParts;

  if (!accountPart) {
    throw new Error(
      `Token reference ${JSON.stringify(reference)} ` +
        "repo account part cannot be empty",
    );
  }
  if (!repoPart) {
    throw new Error(
      `Token reference ${JSON.stringify(reference)} ` +
        "repo name part cannot be empty",
    );
  }

  return accountPart === "."
    ? `${repoRefToString(createRepoRef(definingRepo.account, repoPart))}` +
        `.${namePart}`
    : reference;
}
