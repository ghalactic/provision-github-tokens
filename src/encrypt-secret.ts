import sodium from "libsodium-wrappers";
import {
  accountOrRepoRefToString,
  isEnvRef,
  isRepoRef,
} from "./github-reference.js";
import type { Octokit } from "./octokit.js";
import type { ProvisionRequestTarget } from "./provision-request.js";
import type { FindProvisionerOctokit } from "./provisioner-octokit.js";
import type { PublicKey } from "./type/github-api.js";

export type EncryptSecret = (
  target: ProvisionRequestTarget,
  plaintext: string,
) => Promise<[encrypted: string, keyId: string]>;

export function createEncryptSecret(
  findProvisionerOctokit: FindProvisionerOctokit,
): EncryptSecret {
  const keys: Record<string, PublicKey> = {};

  return async (target, plaintext) => {
    const found = findProvisionerOctokit(target.target);
    if (!found) {
      throw new Error(
        "No provisioners found for target " +
          accountOrRepoRefToString(target.target),
      );
    }
    const [octokit] = found;

    const keyCacheId = JSON.stringify([
      target.type,
      target.target.account,
      isRepoRef(target.target) ? target.target.repo : undefined,
      isEnvRef(target.target) ? target.target.environment : undefined,
    ]);
    const key = keys[keyCacheId] ?? (await getPublicKey(octokit, target));
    keys[keyCacheId] = key;

    await sodium.ready;

    const binKey = sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL);
    const binPlaintext = sodium.from_string(plaintext);
    const encryptedBytes = sodium.crypto_box_seal(
      binPlaintext,
      binKey,
      "uint8array",
    );
    const encrypted = sodium.to_base64(
      encryptedBytes,
      sodium.base64_variants.ORIGINAL,
    );

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

    /* istanbul ignore else - @preserve */
    if (type === "environment") {
      return (
        await octokit.rest.actions.getEnvironmentPublicKey({
          owner: target.account,
          repo: target.repo,
          environment_name: target.environment,
        })
      ).data;
    }

    /* istanbul ignore next - @preserve */
    throw new Error(
      `Invariant violation: Unexpected target type ${JSON.stringify(type)}`,
    );
  }
}
