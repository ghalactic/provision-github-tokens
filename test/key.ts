import sodium from "libsodium-wrappers";
import type { PublicKey } from "../src/type/github-api.js";

export type TestKeyPair = {
  githubPublic: PublicKey;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

export async function createTestKeyPair(id: string): Promise<TestKeyPair> {
  await sodium.ready;

  const keyPair = sodium.crypto_box_keypair("uint8array");

  return {
    ...keyPair,
    githubPublic: {
      key_id: id,
      key: sodium.to_base64(keyPair.publicKey, sodium.base64_variants.ORIGINAL),
    },
  };
}

export async function decrypt(
  keyPair: TestKeyPair,
  encrypted: string,
): Promise<string> {
  await sodium.ready;

  return sodium.to_string(
    sodium.crypto_box_seal_open(
      sodium.from_base64(encrypted, sodium.base64_variants.ORIGINAL),
      keyPair.publicKey,
      keyPair.privateKey,
      "uint8array",
    ),
  );
}
