import { info, warning } from "@actions/core";
import { RequestError } from "@octokit/request-error";
import type { EncryptSecret } from "./encrypt-secret.js";
import { createAgentsOctokit } from "./octokit-agents.js";
import type { Octokit } from "./octokit.js";
import { createTextProvisionExplainer } from "./provision-explainer/text.js";
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
import type { ProvisionResult } from "./type/provision-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";
import type { TokenCreationResult } from "./type/token-creation-result.js";

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
    // eslint-disable-next-line @typescript-eslint/naming-convention -- GitHub API parameter
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
