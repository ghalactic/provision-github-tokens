import { createRepoRegistry, type RepoRegistry } from "../src/repo-registry.js";
import type { Visibility } from "../src/type/visibility.js";
import { createTestRepo } from "./github-api.js";

export function createTestRepoRegistry(
  ...repos: [account: string, repo: string, visibility?: Visibility][]
): RepoRegistry {
  const registry = createRepoRegistry();

  for (const [account, repo, visibility = "private"] of repos) {
    registry.register(createTestRepo(account, repo, visibility));
  }

  return registry;
}
