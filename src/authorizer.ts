import { info, warning } from "@actions/core";
import { compareProvisionRequest } from "./compare-provision-request.js";
import { compareTokenRequest } from "./compare-token-request.js";
import type { DiscoveredRequester } from "./discover-requesters.js";
import { createTextProvisionAuthExplainer } from "./provision-auth-explainer/text.js";
import type { ProvisionAuthorizer } from "./provision-authorizer.js";
import type { ProvisionRequestFactory } from "./provision-request.js";
import { createTextTokenAuthExplainer } from "./token-auth-explainer/text.js";
import type { TokenAuthorizer } from "./token-authorizer.js";
import type { ProvisionAuthResult } from "./type/provision-auth-result.js";
import type { TokenAuthResult } from "./type/token-auth-result.js";

export type Authorizer = {
  authorize: (requesters: DiscoveredRequester[]) => Promise<AuthorizeResult>;
};

export type AuthorizeResult = {
  provisionResults: ProvisionAuthResult[];
  tokenResults: TokenAuthResult[];
};

export function createAuthorizer(
  createProvisionRequest: ProvisionRequestFactory,
  provisionAuthorizer: ProvisionAuthorizer,
  tokenAuthorizer: TokenAuthorizer,
): Authorizer {
  return {
    async authorize(requesters) {
      for (const discovered of requesters.values()) {
        for (const name in discovered.config.provision.secrets) {
          provisionAuthorizer.authorizeSecret(
            await createProvisionRequest(
              discovered.requester,
              name,
              discovered.config.provision.secrets[name],
            ),
          );
        }
      }

      const provisionResults = provisionAuthorizer
        .listResults()
        .sort((a, b) => compareProvisionRequest(a.request, b.request));
      const tokenResults = tokenAuthorizer
        .listResults()
        .sort((a, b) => compareTokenRequest(a.request, b.request));

      const provisionAuthExplainer =
        createTextProvisionAuthExplainer(tokenResults);
      const tokenAuthExplainer = createTextTokenAuthExplainer();

      if (provisionResults.length > 0) {
        for (let i = 1; i <= provisionResults.length; ++i) {
          info(`\nSecret #${i}:\n`);
          info(provisionAuthExplainer(provisionResults[i - 1]));
        }
      } else {
        info("");
        warning("❌ No secrets were authorized");
      }

      if (tokenResults.length > 0) {
        for (let i = 1; i <= tokenResults.length; ++i) {
          info(`\nToken #${i}:\n`);
          info(tokenAuthExplainer(tokenResults[i - 1]));
        }
      } else {
        info("");
        warning("❌ No tokens were authorized");
      }

      info("");

      return { provisionResults, tokenResults };
    },
  };
}
