import type { Octokit } from "@octokit/action";
import { createRequire } from "node:module";
import type { AppRegistry } from "./app-registry.js";
import { accountOrRepoRefToString, isRepoRef } from "./github-reference.js";
import type { OctokitFactory } from "./octokit.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type { PublicKey } from "./type/github-api.js";
import type { AppInput } from "./type/input.js";

const require = createRequire(import.meta.url);

export type SecretEncrypter = (
  target: ProvisionRequestTarget,
  plaintext: string,
) => Promise<[encrypted: string, keyId: string]>;

export function createSecretEncrypter(
  appRegistry: AppRegistry,
  appsInput: AppInput[],
  octokitFactory: OctokitFactory,
): SecretEncrypter {
  const sodium = require("libsodium-wrappers");
  const keys: Record<string, PublicKey> = {};

  return async (target, plaintext) => {
    const [provisionerReg] = appRegistry.findProvisionersForAccountOrRepo(
      target.target,
    );

    if (!provisionerReg) {
      throw new Error(
        "No provisioners found for target " +
          accountOrRepoRefToString(target.target),
      );
    }

    const { installation } = provisionerReg;
    const octokit = octokitFactory.installationOctokit(
      appsInput,
      installation.app_id,
      installation.id,
    );

    const keyCacheId = JSON.stringify([
      target.type,
      target.target.account,
      isRepoRef(target.target) ? target.target.repo : undefined,
    ]);
    const key = keys[keyCacheId] ?? (await getPublicKey(octokit, target));
    keys[keyCacheId] = key;

    await sodium.ready;

    const binKey = sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL);
    const binPlaintext = sodium.from_string(plaintext);
    const encrypted = sodium.crypto_box_seal(binPlaintext, binKey, "base64");

    return [encrypted, key.key_id];
  };

  async function getPublicKey(
    octokit: Octokit,
    { type, target }: ProvisionRequestTarget,
  ): Promise<PublicKey> {
    if (type === "actions") {
      if (isRepoRef(target)) {
        return (
          await octokit.rest.actions.getRepoPublicKey({
            owner: target.account,
            repo: target.repo,
          })
        ).data;
      }

      return (
        await octokit.rest.actions.getOrgPublicKey({
          org: target.account,
        })
      ).data;
    }

    if (type === "codespaces") {
      if (isRepoRef(target)) {
        return (
          await octokit.rest.codespaces.getRepoPublicKey({
            owner: target.account,
            repo: target.repo,
          })
        ).data;
      }

      return (
        await octokit.rest.codespaces.getOrgPublicKey({
          org: target.account,
        })
      ).data;
    }

    if (type === "dependabot") {
      if (isRepoRef(target)) {
        return (
          await octokit.rest.dependabot.getRepoPublicKey({
            owner: target.account,
            repo: target.repo,
          })
        ).data;
      }

      return (
        await octokit.rest.dependabot.getOrgPublicKey({
          org: target.account,
        })
      ).data;
    }

    if (type === "environment") {
      return (
        await octokit.rest.actions.getEnvironmentPublicKey({
          owner: target.account,
          repo: target.repo,
          environment_name: target.environment,
        })
      ).data;
      /* v8 ignore start */
    }

    throw new Error(
      `Invariant violation: Unexpected target type ${JSON.stringify(type)}`,
    );
    /* v8 ignore stop */
  }
}
