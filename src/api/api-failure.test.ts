import { describe, expect, it } from "vitest";

import {
  ApiError,
  failureOf,
  parseRetryAfter,
  retryAfterMinutes,
  toApiFailure,
  unwrap,
  type ApiFailure,
} from "./api-failure";
import { describeFailure } from "./failure-message";

describe("toApiFailure", () => {
  it.each<[number, unknown, string | null, ApiFailure]>([
    [500, null, null, { kind: "unavailable", status: 500 }],
    [
      502,
      { error: "upstream_unavailable" },
      null,
      { kind: "unavailable", status: 502 },
    ],
    [504, null, null, { kind: "unavailable", status: 504 }],
    [
      429,
      { error: "too_many_attempts" },
      "125",
      { kind: "rate_limited", retryAfterSeconds: 125 },
    ],
    [429, null, "abc", { kind: "rate_limited", retryAfterSeconds: null }],
    [401, { error: "unauthenticated" }, null, { kind: "unauthenticated" }],
    [
      401,
      { error: "invalid_credentials" },
      null,
      { kind: "rejected", status: 401, code: "invalid_credentials" },
    ],
    [
      401,
      { error: "invalid_token" },
      null,
      { kind: "rejected", status: 401, code: "invalid_token" },
    ],
    [
      403,
      { error: "business_not_selected" },
      null,
      { kind: "rejected", status: 403, code: "business_not_selected" },
    ],
    [
      400,
      { error: "weak_password" },
      null,
      { kind: "rejected", status: 400, code: "weak_password" },
    ],
    [
      404,
      { error: "business_not_found" },
      null,
      { kind: "rejected", status: 404, code: "business_not_found" },
    ],
    [404, "not json", null, { kind: "rejected", status: 404, code: null }],
    [400, { error: 7 }, null, { kind: "rejected", status: 400, code: null }],
  ])("%i %j Retry-After %j", (status, body, retryAfter, expected) => {
    expect(toApiFailure(status, body, retryAfter)).toEqual(expected);
  });
});

describe("parseRetryAfter", () => {
  it.each<[string | null, number | null]>([
    ["125", 125],
    ["0", 0],
    [null, null],
    ["", null],
    ["abc", null],
    ["-1", null],
    ["1.5", null],
    ["Wed, 21 Oct 2026 07:28:00 GMT", null],
  ])("%j → %j", (value, expected) => {
    expect(parseRetryAfter(value)).toBe(expected);
  });
});

describe("retryAfterMinutes", () => {
  it.each([
    [0, 1],
    [1, 1],
    [60, 1],
    [61, 2],
    [125, 3],
    [900, 15],
  ])("%i s → %i min", (seconds, minutes) => {
    expect(retryAfterMinutes(seconds)).toBe(minutes);
  });
});

describe("unwrap", () => {
  it("turns a thrown fetch into a network failure", async () => {
    const error = await unwrap(
      Promise.reject(new TypeError("fetch failed")),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(failureOf(error)).toEqual({ kind: "network" });
  });

  it("turns a timeout into a network failure", async () => {
    const error = await unwrap(
      Promise.reject(new DOMException("timed out", "TimeoutError")),
    ).catch((caught: unknown) => caught);
    expect(failureOf(error)).toEqual({ kind: "network" });
  });

  it("returns undefined for a 204", async () => {
    const result = await unwrap(
      Promise.resolve({ response: new Response(null, { status: 204 }) }),
    );
    expect(result).toBeUndefined();
  });

  it("returns the data of a 200", async () => {
    const result = await unwrap(
      Promise.resolve({
        data: { ok: true },
        response: new Response(null, { status: 200 }),
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("maps a 429 with its Retry-After header", async () => {
    const error = await unwrap(
      Promise.resolve({
        error: { error: "too_many_attempts" },
        response: new Response(null, {
          status: 429,
          headers: { "retry-after": "125" },
        }),
      }),
    ).catch((caught: unknown) => caught);
    expect(failureOf(error)).toEqual({
      kind: "rate_limited",
      retryAfterSeconds: 125,
    });
  });

  it("maps a rejection with its code", async () => {
    const error = await unwrap(
      Promise.resolve({
        error: { error: "invalid_credentials" },
        response: new Response(null, { status: 401 }),
      }),
    ).catch((caught: unknown) => caught);
    expect(failureOf(error)).toEqual({
      kind: "rejected",
      status: 401,
      code: "invalid_credentials",
    });
  });
});

describe("failureOf", () => {
  it("is null for an error that is not an ApiError", () => {
    expect(failureOf(new Error("boom"))).toBeNull();
  });
});

describe("describeFailure", () => {
  const byCode = {
    invalid_credentials: "El email o la contraseña no son correctos.",
  };

  it.each<[ApiFailure, string]>([
    [
      { kind: "network" },
      "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.",
    ],
    [
      { kind: "unavailable", status: 502 },
      "El sistema no está respondiendo. Probá de nuevo en unos minutos.",
    ],
    [
      { kind: "rate_limited", retryAfterSeconds: 125 },
      "Hubo demasiados intentos. Probá de nuevo en 3 minutos.",
    ],
    [
      { kind: "rate_limited", retryAfterSeconds: 30 },
      "Hubo demasiados intentos. Probá de nuevo en 1 minuto.",
    ],
    [
      { kind: "rate_limited", retryAfterSeconds: null },
      "Hubo demasiados intentos. Probá de nuevo en unos minutos.",
    ],
    [
      { kind: "rejected", status: 401, code: "invalid_credentials" },
      "El email o la contraseña no son correctos.",
    ],
    [
      { kind: "rejected", status: 400, code: "other" },
      "Algo salió mal. Probá de nuevo.",
    ],
    [
      { kind: "rejected", status: 400, code: null },
      "Algo salió mal. Probá de nuevo.",
    ],
    [{ kind: "unauthenticated" }, "Algo salió mal. Probá de nuevo."],
  ])("%j", (failure, text) => {
    expect(describeFailure(failure, byCode)).toBe(text);
  });
});
