import type { Visibility } from "./type/visibility.js";

export function isVisibility(value: unknown): value is Visibility {
  return value === "private" || value === "internal" || value === "public";
}

export function isVisibilityWithin(
  target: Visibility,
  allowed: Visibility,
): boolean {
  return VISIBILITY_RANK[target] <= VISIBILITY_RANK[allowed];
}

const VISIBILITY_RANK = {
  private: 0,
  internal: 1,
  public: 2,
} as const;
