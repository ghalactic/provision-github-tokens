import { info } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import type { EncryptSecret } from "./encrypt-secret.js";
import { isRepoRef } from "./github-reference.js";
import type { Octokit } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import type { TokenCreationResult } from "./token-factory.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

export type Provisioner = (
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  authResults: ProvisionAuthResult[],
) => Promise<
  Map<ProvisionAuthResult, Map<ProvisionAuthTargetResult, ProvisioningResult>>
>;

export type ProvisioningResult =
  | ProvisioningNotAllowedResult
  | ProvisioningNoTokenResult
  | ProvisioningNoProvisionerResult
  | ProvisioningProvisionedResult
  | ProvisioningRequestErrorResult
  | ProvisioningErrorResult;

export type ProvisioningNotAllowedResult = {
  type: "NOT_ALLOWED";
};

export type ProvisioningNoTokenResult = {
  type: "NO_TOKEN";
};

export type ProvisioningNoProvisionerResult = {
  type: "NO_PROVISIONER";
};

export type ProvisioningProvisionedResult = {
  type: "PROVISIONED";
};

export type ProvisioningRequestErrorResult = {
  type: "REQUEST_ERROR";
  error: RequestError;
};

export type ProvisioningErrorResult = {
  type: "ERROR";
  error: unknown;
};

export function createProvisioner(
  findProvisionerOctokit: FindProvisionerOctokit,
  encryptSecret: EncryptSecret,
): Provisioner {
  return async (tokens, authResults) => {
    const provisionResults = new Map<
      ProvisionAuthResult,
      Map<ProvisionAuthTargetResult, ProvisioningResult>
    >();

    for (const auth of authResults) {
      const targetResults = new Map<
        ProvisionAuthTargetResult,
        ProvisioningResult
      >();
      provisionResults.set(auth, targetResults);

      for (const targetAuth of auth.results) {
        if (!auth.isAllowed) {
          targetResults.set(targetAuth, { type: "NOT_ALLOWED" });

          continue;
        }

        /* istanbul ignore next - @preserve */
        if (!targetAuth.tokenAuthResult) {
          throw new Error(
            "Invariant violation: Missing token auth result for allowed target",
          );
        }

        const tokenResult = tokens.get(targetAuth.tokenAuthResult);

        /* istanbul ignore next - @preserve */
        if (!tokenResult) {
          throw new Error(
            "Invariant violation: " +
              "Missing token creation result for allowed target",
          );
        }

        if (tokenResult.type !== "CREATED") {
          targetResults.set(targetAuth, { type: "NO_TOKEN" });

          continue;
        }

        const found = findProvisionerOctokit(targetAuth.target.target);
        if (!found) {
          targetResults.set(targetAuth, { type: "NO_PROVISIONER" });

          continue;
        }
        const [octokit] = found;

        let encrypted: string;
        let keyId: string;

        try {
          [encrypted, keyId] = await encryptSecret(
            targetAuth.target,
            tokenResult.token.token,
          );
        } catch (error) {
          if (error instanceof RequestError) {
            targetResults.set(targetAuth, { type: "REQUEST_ERROR", error });
          } else {
            targetResults.set(targetAuth, { type: "ERROR", error });
          }

          continue;
        }

        try {
          await provisionToTarget(
            octokit,
            encrypted,
            keyId,
            auth.request.name,
            targetAuth.target,
          );

          targetResults.set(targetAuth, { type: "PROVISIONED" });
        } catch (error) {
          if (error instanceof RequestError) {
            targetResults.set(targetAuth, { type: "REQUEST_ERROR", error });
          } else {
            targetResults.set(targetAuth, { type: "ERROR", error });
          }
        }
      }
    }

    let provisionedCount = 0;
    let notProvisionedCount = 0;

    for (const result of provisionResults.values()) {
      for (const targetResult of result.values()) {
        if (targetResult.type === "PROVISIONED") {
          ++provisionedCount;
        } else {
          ++notProvisionedCount;
        }
      }
    }

    if (provisionedCount > 0) {
      info(`Provisioned ${pluralize(provisionedCount, "secret", "secrets")}`);
    }
    if (notProvisionedCount > 0) {
      const pluralized = pluralize(
        notProvisionedCount,
        "requested secret wasn't",
        "requested secrets weren't",
      );
      info(`${pluralized} provisioned`);
    }

    return provisionResults;
  };

  async function provisionToTarget(
    octokit: Octokit,
    encrypted: string,
    keyId: string,
    name: string,
    { type, target }: ProvisionRequestTarget,
  ): Promise<void> {
    if (type === "actions") {
      if (isRepoRef(target)) {
        await octokit.rest.actions.createOrUpdateRepoSecret({
          owner: target.account,
          repo: target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await octokit.rest.actions.createOrUpdateOrgSecret({
          org: target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          visibility: "all",
        });
      }

      return;
    }

    if (type === "codespaces") {
      if (isRepoRef(target)) {
        await octokit.rest.codespaces.createOrUpdateRepoSecret({
          owner: target.account,
          repo: target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await octokit.rest.codespaces.createOrUpdateOrgSecret({
          org: target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          visibility: "all",
        });
      }

      return;
    }

    if (type === "dependabot") {
      if (isRepoRef(target)) {
        await octokit.rest.dependabot.createOrUpdateRepoSecret({
          owner: target.account,
          repo: target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await octokit.rest.dependabot.createOrUpdateOrgSecret({
          org: target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          visibility: "all",
        });
      }

      return;
    }

    /* istanbul ignore else - @preserve */
    if (type === "environment") {
      await octokit.rest.actions.createOrUpdateEnvironmentSecret({
        owner: target.account,
        repo: target.repo,
        environment_name: target.environment,
        secret_name: name,
        encrypted_value: encrypted,
        key_id: keyId,
      });

      return;
    }

    /* istanbul ignore next - @preserve */
    throw new Error(
      `Invariant violation: Unexpected target type ${JSON.stringify(type)}`,
    );
  }
}
