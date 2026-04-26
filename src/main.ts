/* istanbul ignore file - TODO: remove coverage ignore - @preserve */
import { group, setFailed, summary } from "@actions/core";
import { install as installSourceMapSupport } from "source-map-support";
import { createAppRegistry } from "./app-registry.js";
import { createAuthorizer } from "./authorizer.js";
import { readAppsInput } from "./config/apps-input.js";
import { readProviderConfig } from "./config/provider-config.js";
import { discoverApps } from "./discover-apps.js";
import { discoverRequesters } from "./discover-requesters.js";
import { createEncryptSecret } from "./encrypt-secret.js";
import { createEnvironmentResolver } from "./environment-resolver.js";
import { errorStack } from "./error.js";
import { createFindIssuerOctokit } from "./issuer-octokit.js";
import { createOctokitFactory } from "./octokit.js";
import { createProvisionAuthorizer } from "./provision-authorizer.js";
import { createProvisionRequestFactory } from "./provision-request.js";
import { createFindProvisionerOctokit } from "./provisioner-octokit.js";
import { createProvisioner } from "./provisioner.js";
import { registerTokenDeclarations } from "./register-token-declarations.js";
import { renderSummary } from "./summary.js";
import { createTokenAuthorizer } from "./token-authorizer.js";
import { createTokenDeclarationRegistry } from "./token-declaration-registry.js";
import { createTokenFactory } from "./token-factory.js";
import { createTokenRequestFactory } from "./token-request.js";

try {
  installSourceMapSupport();

  const githubRef = process.env.GITHUB_REF;
  const githubRepository = process.env.GITHUB_REPOSITORY;
  const githubServerUrl = process.env.GITHUB_SERVER_URL;
  /* istanbul ignore next - @preserve */
  if (!githubRef) {
    throw new Error("Invariant violation: GITHUB_REF is not set");
  }

  /* istanbul ignore next - @preserve */
  if (!githubRepository) {
    throw new Error("Invariant violation: GITHUB_REPOSITORY is not set");
  }

  /* istanbul ignore next - @preserve */
  if (!githubServerUrl) {
    throw new Error("Invariant violation: GITHUB_SERVER_URL is not set");
  }

  const githubActionRepository =
    process.env.GITHUB_ACTION_REPOSITORY ?? githubRepository;
  const actionUrl = `${githubServerUrl}/${githubActionRepository}`;

  const appsInput = readAppsInput();
  const octokitFactory = createOctokitFactory();

  const config = await group("Reading config", async () => {
    return await readProviderConfig(
      octokitFactory,
      githubRepository,
      githubRef,
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
  const encryptSecret = createEncryptSecret(findProvisionerOctokit);
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

  const authorizeResult = await group("Authorizing requests", async () => {
    return await authorizer.authorize(Array.from(requesters.values()));
  });

  const tokens = await group("Creating tokens", async () => {
    return await createTokens(tokenAuthorizer.listResults());
  });

  const provisionResults = await group("Provisioning secrets", async () => {
    return await provisionSecrets(tokens, provisionAuthorizer.listResults());
  });

  await summary
    .addRaw(
      renderSummary(
        githubServerUrl,
        actionUrl,
        authorizeResult,
        tokens,
        provisionResults,
      ),
    )
    .write();
} catch (error) {
  setFailed(errorStack(error));
}
