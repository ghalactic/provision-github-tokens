import type { AccountSecretVisibility } from "../provision-request.js";

export function accountSecretVisibilityCategoryLabel(
  visibility: AccountSecretVisibility,
): string {
  if (visibility === "all") return "all repos";
  if (visibility === "private") return "private repos";

  return visibility.patterns.length > 0 ? "selected repos" : "no repos";
}
