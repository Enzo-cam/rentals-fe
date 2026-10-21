import { describe, expect, it } from "vitest";

import { readBoundedBody } from "./read-bounded-body";

type Chunk = Uint8Array<ArrayBuffer>;

function streamOf(...sizes: number[]): ReadableStream<Chunk> {
  return new ReadableStream<Chunk>({
    start(controller) {
      for (const size of sizes) controller.enqueue(new Uint8Array(size));
      controller.close();
    },
  });
}

describe("readBoundedBody", () => {
  it("returns the whole body when it fits", async () => {
    const result = await readBoundedBody(streamOf(3, 4), 10, 1000);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.body.size).toBe(7);
  });

  it("accepts exactly the cap", async () => {
    const result = await readBoundedBody(streamOf(5, 5), 10, 1000);
    expect(result.kind).toBe("ok");
  });

  it("returns an empty body for an empty stream", async () => {
    const result = await readBoundedBody(streamOf(), 10, 1000);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.body.size).toBe(0);
  });

  it("stops at the first byte over the cap and cancels the stream", async () => {
    let cancelled = false;
    let pulls = 0;
    const stream = new ReadableStream<Chunk>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(6));
      },
      cancel() {
        cancelled = true;
      },
    });
    const result = await readBoundedBody(stream, 10, 1000);
    expect(result.kind).toBe("too_large");
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThanOrEqual(3);
  });

  it("reports a client that breaks the stream as bad_body", async () => {
    const stream = new ReadableStream<Chunk>({
      start(controller) {
        controller.enqueue(new Uint8Array(2));
      },
      pull(controller) {
        controller.error(new Error("aborted"));
      },
    });
    expect((await readBoundedBody(stream, 10, 1000)).kind).toBe("bad_body");
  });

  it("gives up after the deadline on a stream that never delivers, and cancels it", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Chunk>({
      cancel() {
        cancelled = true;
      },
    });
    const started = Date.now();
    const result = await readBoundedBody(stream, 10, 50);
    expect(result.kind).toBe("timeout");
    expect(Date.now() - started).toBeGreaterThanOrEqual(45);
    expect(cancelled).toBe(true);
  });

  it("applies the deadline to the whole body, not to each chunk", async () => {
    const stream = new ReadableStream<Chunk>({
      async pull(controller) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        controller.enqueue(new Uint8Array(1));
      },
    });
    expect((await readBoundedBody(stream, 1000, 100)).kind).toBe("timeout");
  });
});
