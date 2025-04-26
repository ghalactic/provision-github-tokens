import { isEnvRef, isRepoRef } from "./github-reference.js";
import type { ProvisionRequestTarget } from "./type/provision-request.js";

export function compareProvisionRequestTarget(
  a: ProvisionRequestTarget,
  b: ProvisionRequestTarget,
): number {
  // sort by account first
  const accountCompare = a.target.account.localeCompare(b.target.account);
  if (accountCompare !== 0) return accountCompare;

  if (isRepoRef(a.target)) {
    // a is repo ref, b is account ref, so b comes first
    if (!isRepoRef(b.target)) return 1;

    // both are repo refs, sort by repo
    const repoCompare = a.target.repo.localeCompare(b.target.repo);
    if (repoCompare !== 0) return repoCompare;

    if (isEnvRef(a.target)) {
      // a is env ref, b is repo ref, so b comes first
      if (!isEnvRef(b.target)) return 1;

      // both are env refs, sort by environment
      const envCompare = a.target.environment.localeCompare(
        b.target.environment,
      );
      if (envCompare !== 0) return envCompare;

      // account, repo, and env are the same, so fall through
    } else if (isEnvRef(b.target)) {
      // a is repo ref, b is env ref, so a comes first
      return -1;
    }
  } else if (isRepoRef(b.target)) {
    // a is account ref, b is repo ref, so a comes first
    return -1;
  }

  return a.type.localeCompare(b.type);
}
