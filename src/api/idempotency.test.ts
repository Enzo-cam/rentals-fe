import { describe, expect, it } from "vitest";

import { ApiError, type ApiFailure } from "./api-failure";
import { createIdempotencyKeys, runWithKey } from "./idempotency";

function counting() {
  let n = 0;
  return createIdempotencyKeys(() => `key-${++n}`);
}

/**
 * The key is held by intent until a success. What happens to a key when the body changes between two taps is a matter
 * of the hook and of the E2E of the first screen that uses it, not of these pure keys.
 */
describe("createIdempotencyKeys", () => {
  it("gives the same key to the same intent until it succeeds", () => {
    const keys = counting();
    expect(keys.keyFor("a")).toBe("key-1");
    expect(keys.keyFor("a")).toBe("key-1");
  });

  it("asks for a new key after a success", () => {
    const keys = counting();
    const first = keys.keyFor("a");
    keys.succeeded("a", first);
    expect(keys.keyFor("a")).not.toBe(first);
  });

  it("gives another intent another key, and a success of one does not release the other", () => {
    const keys = counting();
    const confirm = keys.keyFor("b1:confirm");
    const cancel = keys.keyFor("b1:cancel");
    expect(cancel).not.toBe(confirm);
    keys.succeeded("b1:confirm", confirm);
    expect(keys.keyFor("b1:cancel")).toBe(cancel);
    expect(keys.keyFor("b1:confirm")).not.toBe(confirm);
  });

  it("ignores the late success of an older key: it does not release the current one", () => {
    const keys = counting();
    const old = keys.keyFor("a");
    keys.succeeded("a", old);
    const current = keys.keyFor("a");
    keys.succeeded("a", old);
    expect(keys.keyFor("a")).toBe(current);
  });

  it("uses a UUID v4 by default", () => {
    const key = createIdempotencyKeys().keyFor("a");
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

const FAILURES: unknown[] = [
  new ApiError({ kind: "network" }),
  new ApiError({ kind: "unavailable", status: 503 }),
  new ApiError({ kind: "rate_limited", retryAfterSeconds: 30 }),
  new ApiError({
    kind: "rejected",
    status: 409,
    code: "insufficient_availability",
  }),
  new ApiError({ kind: "rejected", status: 400, code: "invalid_request" }),
  new ApiError({ kind: "rejected", status: 403, code: "read_only" }),
  new ApiError({
    kind: "rejected",
    status: 422,
    code: "idempotency_key_reused",
  }),
  new ApiError({ kind: "unauthenticated" } satisfies ApiFailure),
  new Error("boom"),
];

describe("runWithKey", () => {
  it("gives the call the key of the intent and releases it when the call succeeds", async () => {
    const keys = counting();
    const sent: string[] = [];
    const call = async (key: string) => {
      sent.push(key);
      return "ok";
    };
    expect(await runWithKey(keys, "a", call)).toBe("ok");
    await runWithKey(keys, "a", call);
    expect(sent).toEqual(["key-1", "key-2"]);
  });

  it.each(FAILURES)(
    "rethrows %j and keeps the key: the API stores a key only for a success, so a retry is always safe",
    async (failure) => {
      const keys = counting();
      const sent: string[] = [];
      const call = async (key: string) => {
        sent.push(key);
        throw failure;
      };
      await expect(runWithKey(keys, "a", call)).rejects.toBe(failure);
      await expect(runWithKey(keys, "a", call)).rejects.toBe(failure);
      expect(sent).toEqual(["key-1", "key-1"]);
    },
  );
});
