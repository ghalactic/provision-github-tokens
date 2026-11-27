import { debug, info, warning } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import type { EncryptSecret } from "./encrypt-secret.js";
import { createAgentsOctokit } from "./octokit-agents.js";
import type { Octokit } from "./octokit.js";
import { createTextProvisionExplainer } from "./provision-explainer/text.js";
import { provisionWriteKey } from "./provision-key.js";
import {
  isEnvironmentProvisionRequestTarget,
  isRepoProvisionRequestTarget,
  type AccountSecretVisibility,
  type ProvisionRequestTarget,
} from "./provision-request.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import type {
  ProvisionAuthResult,
  ProvisionAuthTargetResult,
} from "./type/provision-auth-result.js";
import type {
  ProvisionAttempt,
  ProvisionResult,
} from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type {
  TokenCreationCreatedResult,
  TokenCreationResult,
} from "./type/token-creation-result.js";

export type Provisioner = (
  tokens: Map<TokenAuthResult, TokenCreationResult>,
  authResults: ProvisionAuthResult[],
) => Promise<
  Map<ProvisionAuthResult, Map<ProvisionAuthTargetResult, ProvisionResult>>
>;

export function createProvisioner(
  findProvisionerOctokit: FindProvisionerOctokit,
  encryptSecret: EncryptSecret,
): Provisioner {
  return async (tokens, authResults) => {
    const provisionResults = new Map<
      ProvisionAuthResult,
      Map<ProvisionAuthTargetResult, ProvisionResult>
    >();
    const writeResults = new Map<string, ProvisionResult>();

    for (const auth of authResults) {
      const targetResults = new Map<
        ProvisionAuthTargetResult,
        ProvisionResult
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

        const key = provisionWriteKey(
          auth.request.name,
          targetAuth.target,
          targetAuth.tokenAuthResult.request,
        );
        const shared = writeResults.get(key);

        if (shared) {
          targetResults.set(targetAuth, shared);

          continue;
        }

        const result = await provisionToTarget(
          tokenResult,
          auth.request.name,
          targetAuth.target,
        );
        writeResults.set(key, result);
        targetResults.set(targetAuth, result);
      }
    }

    const explain = createTextProvisionExplainer();

    if (provisionResults.size > 0) {
      let i = 0;
      for (const [authResult, targetResults] of provisionResults) {
        ++i;
        info(`\nSecret #${i}:\n`);
        info(explain(authResult, targetResults));
      }
    } else {
      info("");
      warning("⚠️ No secrets were provisioned");
    }

    info("");

    return provisionResults;
  };

  async function provisionToTarget(
    tokenResult: TokenCreationCreatedResult,
    name: string,
    requestTarget: ProvisionRequestTarget,
  ): Promise<ProvisionResult> {
    const candidates = findProvisionerOctokit(requestTarget.target);

    if (candidates.length < 1) return { type: "NO_PROVISIONER" };

    const failedAttempts: ProvisionAttempt[] = [];

    for (const candidate of candidates) {
      const { installation } = candidate.provisioner;
      debug(
        `Trying provisioner app ${installation.app_id} ` +
          `installation ${installation.id}`,
      );

      try {
        const [encrypted, keyId] = await encryptSecret(
          candidate.octokit,
          requestTarget,
          tokenResult.token.token,
        );

        await createOrUpdateSecret(
          candidate.octokit,
          encrypted,
          keyId,
          name,
          requestTarget,
        );

        return {
          type: "PROVISIONED",
          provisioner: candidate.provisioner,
          failedAttempts,
        };
      } catch (error) {
        failedAttempts.push(
          error instanceof RequestError
            ? {
                type: "REQUEST_ERROR",
                provisioner: candidate.provisioner,
                error,
              }
            : { type: "ERROR", provisioner: candidate.provisioner, error },
        );
      }
    }

    return { type: "FAILED", attempts: failedAttempts };
  }

  async function createOrUpdateSecret(
    octokit: Octokit,
    encrypted: string,
    keyId: string,
    name: string,
    requestTarget: ProvisionRequestTarget,
  ): Promise<void> {
    const { type } = requestTarget;

    if (type === "actions") {
      if (isRepoProvisionRequestTarget(requestTarget)) {
        await octokit.rest.actions.createOrUpdateRepoSecret({
          owner: requestTarget.target.account,
          repo: requestTarget.target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await octokit.rest.actions.createOrUpdateOrgSecret({
          org: requestTarget.target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          ...toOrgSecretVisibilityParams(requestTarget.visibility),
        });
      }

      return;
    }

    if (type === "agents") {
      const agents = createAgentsOctokit(octokit);

      if (isRepoProvisionRequestTarget(requestTarget)) {
        await agents.createOrUpdateRepoSecret({
          owner: requestTarget.target.account,
          repo: requestTarget.target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await agents.createOrUpdateOrgSecret({
          org: requestTarget.target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          ...toOrgSecretVisibilityParams(requestTarget.visibility),
        });
      }

      return;
    }

    if (type === "codespaces") {
      if (isRepoProvisionRequestTarget(requestTarget)) {
        await octokit.rest.codespaces.createOrUpdateRepoSecret({
          owner: requestTarget.target.account,
          repo: requestTarget.target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await octokit.rest.codespaces.createOrUpdateOrgSecret({
          org: requestTarget.target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          ...toOrgSecretVisibilityParams(requestTarget.visibility),
        });
      }

      return;
    }

    if (type === "dependabot") {
      if (isRepoProvisionRequestTarget(requestTarget)) {
        await octokit.rest.dependabot.createOrUpdateRepoSecret({
          owner: requestTarget.target.account,
          repo: requestTarget.target.repo,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
        });
      } else {
        await octokit.rest.dependabot.createOrUpdateOrgSecret({
          org: requestTarget.target.account,
          secret_name: name,
          encrypted_value: encrypted,
          key_id: keyId,
          ...toOrgSecretVisibilityParams(requestTarget.visibility),
        });
      }

      return;
    }

    /* istanbul ignore else - @preserve */
    if (isEnvironmentProvisionRequestTarget(requestTarget)) {
      await octokit.rest.actions.createOrUpdateEnvironmentSecret({
        owner: requestTarget.target.account,
        repo: requestTarget.target.repo,
        environment_name: requestTarget.target.environment,
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

  function toOrgSecretVisibilityParams(visibility: AccountSecretVisibility): {
    visibility: "all" | "private" | "selected";
    // eslint-disable-next-line id-match -- GitHub API parameter
    selected_repository_ids?: number[];
  } {
    if (visibility === "all" || visibility === "private") {
      return { visibility };
    }

    return {
      visibility: "selected",
      selected_repository_ids: visibility.repos.map(({ id }) => id),
    };
  }
}
