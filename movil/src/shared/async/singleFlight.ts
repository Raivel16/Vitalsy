/** Comparte una promesa en vuelo entre llamadas concurrentes. */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let inflight: Promise<T> | null = null;
  return () => {
    inflight ??= run().finally(() => {
      inflight = null;
    });
    return inflight;
  };
}
