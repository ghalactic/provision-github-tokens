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
  if (typeof account !== "string" || account.includes("/")) {
    throw new Error(`Invalid account name ${JSON.stringify(account)}`);
  }

  return { account };
}

export function createRepoRef(account: string, repo: string): RepoReference {
  if (typeof account !== "string" || account.includes("/")) {
    throw new Error(`Invalid account name ${JSON.stringify(account)}`);
  }
  if (typeof repo !== "string" || repo.includes("/")) {
    throw new Error(`Invalid repo name ${JSON.stringify(repo)}`);
  }

  return { account, repo };
}

export function createEnvRef(
  account: string,
  repo: string,
  environment: string,
): EnvironmentReference {
  if (typeof account !== "string" || account.includes("/")) {
    throw new Error(`Invalid account name ${JSON.stringify(account)}`);
  }
  if (typeof repo !== "string" || repo.includes("/")) {
    throw new Error(`Invalid repo name ${JSON.stringify(repo)}`);
  }
  if (typeof environment !== "string") {
    throw new Error(`Invalid environment name ${JSON.stringify(environment)}`);
  }

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

export function repoRefToString(ref: RepoReference): string {
  return `${ref.account}/${ref.repo}`;
}

export function accountOrRepoRefToString(ref: AccountOrRepoReference): string {
  return isRepoRef(ref) ? repoRefToString(ref) : ref.account;
}
