import { info } from "@actions/core";
import type { Octokit } from "@octokit/action";
import { RequestError } from "@octokit/request-error";
import type { AppRegistry } from "./app-registry.js";
import { isRepoRef } from "./github-reference.js";
import type { OctokitFactory } from "./octokit.js";
import { pluralize } from "./pluralize.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type { SecretEncrypter } from "./secret-encrypter.js";
import type { TokenCreationResult } from "./token-factory.js";
import type { AppInput } from "./type/input.js";
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
  appRegistry: AppRegistry,
  appsInput: AppInput[],
  octokitFactory: OctokitFactory,
  encryptSecret: SecretEncrypter,
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

        const tokenResult = targetAuth.tokenAuthResult
          ? tokens.get(targetAuth.tokenAuthResult)
          : undefined;

        if (tokenResult?.type !== "CREATED") {
          targetResults.set(targetAuth, { type: "NO_TOKEN" });

          continue;
        }

        const [provisionerReg] = appRegistry.findProvisionersForAccountOrRepo(
          targetAuth.target.target,
        );

        if (!provisionerReg) {
          targetResults.set(targetAuth, { type: "NO_PROVISIONER" });

          continue;
        }

        const [encrypted, keyId] = await encryptSecret(
          targetAuth.target,
          tokenResult.token.token,
        );

        const { installation } = provisionerReg;
        const octokit = octokitFactory.installationOctokit(
          appsInput,
          installation.app_id,
          installation.id,
        );

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
    } else if (type === "codespaces") {
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
    } else if (type === "dependabot") {
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
    } else if (type === "environment") {
      octokit.rest.actions.createOrUpdateEnvironmentSecret({
        owner: target.account,
        repo: target.repo,
        environment_name: target.environment,
        secret_name: name,
        encrypted_value: encrypted,
        key_id: keyId,
      });
      /* v8 ignore start */
    }

    throw new Error(
      `Invariant violation: Unexpected target type ${JSON.stringify(type)}`,
    );
    /* v8 ignore stop */
  }
}
