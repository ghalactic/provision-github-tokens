/**
 * A failed attempt to do some work with a single candidate.
 *
 * @typeParam C - The type of the candidates.
 */
export type TryEachFailedAttempt<C> = {
  /**
   * The candidate that was attempted.
   */
  readonly candidate: C;

  /**
   * The error that the attempt threw.
   */
  readonly error: unknown;
};

/**
 * The result of attempting work until one candidate succeeds or trying stops.
 *
 * @typeParam C - The type of the candidates.
 * @typeParam T - The result type.
 */
export type TryEachResult<C, T> =
  | {
      readonly type: "SUCCEEDED";

      /**
       * The failed attempts made before the successful one.
       */
      readonly failures: readonly TryEachFailedAttempt<C>[];

      /**
       * The candidate that succeeded.
       */
      readonly candidate: C;

      /**
       * The value that the successful attempt returned.
       */
      readonly value: T;
    }
  | {
      readonly type: "FAILED";

      /**
       * The failed attempts made before trying stopped.
       */
      readonly failures: readonly TryEachFailedAttempt<C>[];

      /**
       * Whether every candidate was tried.
       */
      readonly exhausted: boolean;
    };

/**
 * A function that attempts work with a single candidate.
 *
 * Return a value to signal success. The value can be anything, including
 * `undefined` or an `Error` instance. Throw a value to signal failure; the
 * helper records it and may try the next candidate.
 *
 * @typeParam C - The type of the candidates.
 * @typeParam T - The result type.
 *
 * @param candidate - The candidate to attempt work with.
 *
 * @returns A successful result.
 *
 * @throws If the attempt with the candidate fails.
 */
export type TryEachFn<C, T> = (candidate: C) => Promise<T>;

/**
 * Decides whether to try the next candidate after a failed attempt.
 *
 * Can be used to log failures as they occur.
 *
 * @typeParam C - The type of the candidates.
 *
 * @param failure - The failed attempt.
 *
 * @returns Whether to try the next candidate.
 */
export type TryEachShouldTryNextFn<C> = (
  failure: TryEachFailedAttempt<C>,
) => boolean;

/**
 * Attempts to do some work with each candidate until one succeeds or all fail.
 *
 * Candidates are tried in order and only one at a time. Every attempt is
 * recorded, including the successful one's preceding failures.
 *
 * @typeParam C - The type of the candidates.
 * @typeParam T - The result type.
 *
 * @param fn - The work to attempt with each candidate.
 * @param shouldTryNext - Determines whether the next candidate should be tried
 *   after a failed attempt.
 * @param candidates - The candidates to try. Must not be empty.
 *
 * @returns The successful result, or the failures if trying stopped.
 *
 * @throws If `candidates` is empty.
 */
export async function tryEach<C, T>(
  fn: TryEachFn<C, T>,
  shouldTryNext: TryEachShouldTryNextFn<C>,
  candidates: readonly C[],
): Promise<TryEachResult<C, T>> {
  if (candidates.length < 1) {
    throw new Error("Invariant violation: Expected at least one candidate");
  }

  const failures: TryEachFailedAttempt<C>[] = [];

  for (let i = 0; i < candidates.length; ++i) {
    const candidate = candidates[i];

    try {
      return {
        type: "SUCCEEDED",
        failures,
        candidate,
        value: await fn(candidate),
      };
    } catch (error) {
      const failure = { candidate, error };
      failures.push(failure);

      if (!shouldTryNext(failure) && i + 1 < candidates.length) {
        return { type: "FAILED", failures, exhausted: false };
      }
    }
  }

  return { type: "FAILED", failures, exhausted: true };
}
