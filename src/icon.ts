export const DASH_ICON = "➖";
export const FAIL_ICON = "❌";
export const PASS_ICON = "✅";

export function icon(status: unknown): string {
  return typeof status === "undefined"
    ? DASH_ICON
    : status
      ? PASS_ICON
      : FAIL_ICON;
}
