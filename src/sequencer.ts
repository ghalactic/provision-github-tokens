export type Sequencer<T> = (value: T) => number;

export function createSequencer<T>(): Sequencer<T> {
  const seqs = new Map<T, number>();

  return (value) => {
    let seq = seqs.get(value);

    if (typeof seq === "undefined") {
      seq = seqs.size + 1;
      seqs.set(value, seq);
    }

    return seq;
  };
}
