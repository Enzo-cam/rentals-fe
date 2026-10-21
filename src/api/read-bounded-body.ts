export type BodyReadResult =
  | { kind: "ok"; body: Blob }
  | { kind: "too_large" }
  | { kind: "bad_body" }
  | { kind: "timeout" };

/**
 * Reads a request body with a size cap and an overall deadline. Stops (and
 * cancels the stream) as soon as the cap is passed, the deadline expires or
 * the client breaks the stream.
 */
export async function readBoundedBody(
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
  maxBytes: number,
  deadlineMs: number,
): Promise<BodyReadResult> {
  const reader = stream.getReader();
  const stop = () => void reader.cancel().catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), deadlineMs);
  });
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    for (;;) {
      const read = await Promise.race([reader.read(), deadline]);
      if (read === "timeout") {
        stop();
        return { kind: "timeout" };
      }
      if (read.done) return { kind: "ok", body: new Blob(chunks) };
      size += read.value.byteLength;
      if (size > maxBytes) {
        stop();
        return { kind: "too_large" };
      }
      chunks.push(read.value);
    }
  } catch {
    stop();
    return { kind: "bad_body" };
  } finally {
    clearTimeout(timer);
  }
}
