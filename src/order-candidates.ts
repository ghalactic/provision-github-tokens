/**
 * Orders candidates by rendezvous (highest random weight) hashing.
 *
 * The same work key and app IDs always produce the same order, regardless of
 * the input order. Candidates are scored by hashing the work key and the
 * candidate's app ID, then sorted by descending weight, breaking ties by app
 * ID.
 */
export function orderCandidates<T>(
  workKey: string,
  candidates: readonly T[],
  appId: (candidate: T) => number,
): T[] {
  const scored: ScoredCandidate<T>[] = [];

  for (const candidate of candidates) {
    const id = appId(candidate);
    scored.push({
      candidate,
      appId: id,
      weight: candidateWeight(workKey, id),
    });
  }

  scored.sort((a, b) => b.weight - a.weight || a.appId - b.appId);

  const ordered: T[] = [];

  for (const { candidate } of scored) ordered.push(candidate);

  return ordered;
}

type ScoredCandidate<T> = {
  candidate: T;
  appId: number;
  weight: number;
};

function candidateWeight(workKey: string, appId: number): number {
  // A NUL separator keeps the work key and app ID from colliding across their
  // boundary.
  return mulberry32(fnv1a32(`${workKey}\0${appId}`))();
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; ++i) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
