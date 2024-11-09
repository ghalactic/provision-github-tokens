export function wrapErrors<T>(
  fn: () => T,
  createError: (cause: unknown) => Error,
): T {
  try {
    return fn();
  } catch (cause) {
    throw createError(cause);
  }
}
