/* v8 ignore start - TODO: remove coverage ignore */
import "source-map-support/register";

import { group, setFailed, warning } from "@actions/core";
import { createAppRegistry } from "./app-registry.js";
import { createAuthorizer } from "./authorizer.js";
import { readAppsInput } from "./config/apps-input.js";
import { readProviderConfig } from "./config/provider-config.js";
import { discoverApps } from "./discover-apps.js";
import { discoverRequesters } from "./discover-requesters.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { errorStack } from "./error.js";
import { createFindIssuerOctokit } from "./issuer-octokit.js";
import { createOctokitFactory } from "./octokit.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { createProvisionRequestFactory } from "./provision-request.js";
import { createFindProvisionerOctokit } from "./provisioner-octokit.js";
import { createProvisioner } from "./provisioner.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { createSecretEncrypter } from "./secret-encrypter.js";
import { createTokenAuthorizer } from "./token-authorizer.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import { createTokenFactory } from "./token-factory.js";
import { createTokenRequestFactory } from "./token-request.js";

// TODO: Consider that org secrets can be restricted by visibility / selected
//       repos.

main().catch((error) => {
  setFailed(errorStack(error));
});

async function main(): Promise<void> {
  const appsInput = readAppsInput();
  const octokitFactory = createOctokitFactory();

  const config = await group("Reading config", async () => {
    return await readProviderConfig(
      octokitFactory,
      process.env.GITHUB_REPOSITORY ?? "",
      process.env.GITHUB_REF ?? "",
    );
  });

  const appRegistry = createAppRegistry();
  const findIssuerOctokit = createFindIssuerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );
  const findProvisionerOctokit = createFindProvisionerOctokit(
    octokitFactory,
    appRegistry,
    appsInput,
  );
  const declarationRegistry = createTokenDeclarationRegistry();
  const environmentResolver = createEnvironmentResolver(findProvisionerOctokit);
  const createProvisionRequest = createProvisionRequestFactory(
    declarationRegistry,
    appRegistry,
    environmentResolver,
  );
  const createTokenRequest = createTokenRequestFactory(appRegistry);
  const tokenAuthorizer = createTokenAuthorizer(config.permissions);
  const provisionAuthorizer = createProvisionAuthorizer(
    createTokenRequest,
    tokenAuthorizer,
    config.provision,
  );
  const authorizer = createAuthorizer(
    createProvisionRequest,
    provisionAuthorizer,
    tokenAuthorizer,
  );
  const createTokens = createTokenFactory(findIssuerOctokit);
  const encryptSecret = createSecretEncrypter(findProvisionerOctokit);
  const provisionSecrets = createProvisioner(
    findProvisionerOctokit,
    encryptSecret,
  );

  await group("Discovering apps", async () => {
    await discoverApps(octokitFactory, appRegistry, appsInput);
  });

  const requesters = await group("Discovering requesters", async () => {
    const requesters = await discoverRequesters(
      octokitFactory,
      appRegistry,
      appsInput,
    );
    registerTokenDeclarations(declarationRegistry, requesters);

    return requesters;
  });

  await group("Authorizing requests", async () => {
    await authorizer.authorize(Array.from(requesters.values()));
  });

  const tokens = await group("Creating tokens", async () => {
    return await createTokens(tokenAuthorizer.listResults());
  });

  await group("Provisioning secrets", async () => {
    const results = await provisionSecrets(
      tokens,
      provisionAuthorizer.listResults(),
    );

    for (const [auth, targetResults] of results) {
      for (const [targetAuth, result] of targetResults) {
        if (result.type === "REQUEST_ERROR") {
          warning(
            `${JSON.stringify(targetAuth.target)} ${result.error.message}`,
          );
        } else if (result.type === "ERROR") {
          if (result.error instanceof Error) {
            warning(
              `${JSON.stringify(targetAuth.target)} ${result.error.message}`,
            );
          } else {
            warning(`${JSON.stringify(targetAuth.target)} ${result.error}`);
          }
        }
      }
    }
  });
}
/* v8 ignore stop */
