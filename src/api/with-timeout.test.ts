import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aborts with a TimeoutError once the time is up", () => {
    const { signal } = withTimeout(new AbortController().signal, 15_000);
    vi.advanceTimersByTime(14_999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe("TimeoutError");
  });

  it("aborts when the parent aborts", () => {
    const parent = new AbortController();
    const { signal } = withTimeout(parent.signal, 15_000);
    parent.abort();
    expect(signal.aborted).toBe(true);
  });

  it("is already aborted if the parent was", () => {
    const parent = new AbortController();
    parent.abort();
    expect(withTimeout(parent.signal, 15_000).signal.aborted).toBe(true);
  });

  it("does not abort after clear", () => {
    const { signal, clear } = withTimeout(new AbortController().signal, 15_000);
    clear();
    vi.advanceTimersByTime(60_000);
    expect(signal.aborted).toBe(false);
  });
});
