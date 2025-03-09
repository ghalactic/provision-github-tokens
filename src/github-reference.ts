export type AccountReference = {
  account: string;
};

export type RepoReference = {
  account: string;
  repo: string;
};

export type EnvironmentReference = {
  account: string;
  repo: string;
  environment: string;
};

export type AccountOrRepoReference = AccountReference | RepoReference;

export function createAccountRef(account: string): AccountReference {
  assertAccount(account);

  return { account };
}

export function createRepoRef(account: string, repo: string): RepoReference {
  assertAccount(account);
  assertRepo(repo);

  return { account, repo };
}

export function createEnvRef(
  account: string,
  repo: string,
  environment: string,
): EnvironmentReference {
  assertAccount(account);
  assertRepo(repo);
  assertEnvironment(environment);

  return { account, repo, environment };
}

export function isRepoRef(
  ref: AccountReference | RepoReference | EnvironmentReference,
): ref is RepoReference | EnvironmentReference {
  return "repo" in ref && typeof ref.repo === "string";
}

export function isEnvRef(
  ref: AccountReference | RepoReference | EnvironmentReference,
): ref is EnvironmentReference {
  return (
    isRepoRef(ref) &&
    "environment" in ref &&
    typeof ref.environment === "string"
  );
}

export function repoRefFromName(name: string): RepoReference {
  const parts = name.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid repo name ${JSON.stringify(name)}`);
  }

  return createRepoRef(parts[0], parts[1]);
}

export function repoRefToString(ref: RepoReference): string {
  return `${ref.account}/${ref.repo}`;
}

export function accountOrRepoRefToString(ref: AccountOrRepoReference): string {
  return isRepoRef(ref) ? repoRefToString(ref) : ref.account;
}

function assertAccount(account: string): void {
  if (typeof account !== "string" || !account || account.includes("/")) {
    throw new Error(`Invalid account name ${JSON.stringify(account)}`);
  }
}

function assertRepo(repo: string): void {
  if (typeof repo !== "string" || !repo || repo.includes("/")) {
    throw new Error(`Invalid repo name ${JSON.stringify(repo)}`);
  }
}

function assertEnvironment(environment: string): void {
  if (typeof environment !== "string" || !environment) {
    throw new Error(`Invalid environment name ${JSON.stringify(environment)}`);
  }
}
