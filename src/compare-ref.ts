import {
  isEnvRef,
  isRepoRef,
  type AccountOrRepoOrEnvReference,
} from "./github-reference.js";

export function compareRef(
  a: AccountOrRepoOrEnvReference,
  b: AccountOrRepoOrEnvReference,
): number {
  // sort by account first
  const accountCompare = a.account.localeCompare(b.account);
  if (accountCompare !== 0) return accountCompare;

  if (isRepoRef(a)) {
    // a is repo ref, b is account ref, so b comes first
    if (!isRepoRef(b)) return 1;

    // both are repo refs, sort by repo
    const repoCompare = a.repo.localeCompare(b.repo);
    if (repoCompare !== 0) return repoCompare;

    if (isEnvRef(a)) {
      // a is env ref, b is repo ref, so b comes first
      if (!isEnvRef(b)) return 1;

      // both are env refs, sort by environment
      const envCompare = a.environment.localeCompare(b.environment);
      if (envCompare !== 0) return envCompare;

      // account, repo, and env are the same, so fall through
    } else if (isEnvRef(b)) {
      // a is repo ref, b is env ref, so a comes first
      return -1;
    }
  } else if (isRepoRef(b)) {
    // a is account ref, b is repo ref, so a comes first
    return -1;
  }

  return 0;
}
