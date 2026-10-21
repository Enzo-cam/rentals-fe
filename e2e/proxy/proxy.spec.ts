import { expect, test } from "@playwright/test";

import { E2E_ORIGIN_SECRET, FRONT_ORIGIN } from "../support/env";
import { lastApiRequest, resetFakeApi } from "../support/fake-api-control";

type Echo = {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  bodyLength: number;
};

const MIB = 1024 * 1024;
const FOREIGN_ORIGIN = "https://evil.example";

// Headers the HTTP client of the proxy (undici) or the transport add on its own.
const TRANSPORT_HEADERS = [
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
  "accept-language",
  "sec-fetch-mode",
];
const ALLOWED_UPSTREAM = [
  "cookie",
  "content-type",
  "accept",
  "idempotency-key",
  "origin",
  "user-agent",
  "x-origin-secret",
  "x-forwarded-for",
  ...TRANSPORT_HEADERS,
];

/**
 * POST with a streamed body: Node's fetch sends it chunked, without
 * content-length, so the proxy has to count bytes while reading.
 */
async function postChunked(totalBytes: number): Promise<Response> {
  const chunk = new Uint8Array(64 * 1024).fill(97);
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= totalBytes) return controller.close();
      const size = Math.min(chunk.byteLength, totalBytes - sent);
      controller.enqueue(chunk.subarray(0, size));
      sent += size;
    },
  });
  return fetch(`${FRONT_ORIGIN}/api/echo/upload`, {
    method: "POST",
    headers: { origin: FRONT_ORIGIN, "content-type": "text/plain" },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

test.describe("AC-6: header allowlists", () => {
  test("only allowlisted headers reach the API, and the client's x-origin-secret is replaced", async ({
    request,
  }) => {
    const response = await request.get("/api/echo/items?date=2026-11-07", {
      headers: {
        cookie: "session=abc",
        accept: "application/json",
        "idempotency-key": "key-1",
        "x-origin-secret": "forged-by-client",
        authorization: "Bearer stolen",
        "x-custom": "nope",
      },
    });
    expect(response.status()).toBe(200);
    const echo = (await response.json()) as Echo;

    expect(echo.path).toBe("/echo/items");
    expect(echo.query).toBe("?date=2026-11-07");
    expect(echo.headers["x-origin-secret"]).toBe(E2E_ORIGIN_SECRET);
    expect(echo.headers.cookie).toBe("session=abc");
    expect(echo.headers["idempotency-key"]).toBe("key-1");
    expect(echo.headers.authorization).toBeUndefined();
    expect(echo.headers["x-custom"]).toBeUndefined();
    for (const name of Object.keys(echo.headers)) {
      expect(ALLOWED_UPSTREAM, `unexpected header "${name}"`).toContain(name);
    }
  });

  test("every set-cookie comes back and only allowlisted response headers pass", async ({
    request,
  }) => {
    const response = await request.get("/api/echo/cookies");
    expect(response.status()).toBe(200);

    const setCookies = response
      .headersArray()
      .filter(({ name }) => name.toLowerCase() === "set-cookie")
      .map(({ value }) => value);
    expect(setCookies).toEqual([
      "session=abc; Path=/; HttpOnly",
      "theme=dark; Path=/",
    ]);

    const headers = response.headers();
    expect(headers["content-type"]).toContain("application/json");
    expect(headers["cache-control"]).toBe("private, max-age=5");
    expect(headers["retry-after"]).toBe("7");
    expect(headers["x-upstream-extra"]).toBeUndefined();
    // The security headers of next.config.ts also reach /api/*.
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });

  test("a GET with a body is forwarded without it", async ({ request }) => {
    const response = await request.fetch("/api/echo/items", {
      method: "GET",
      headers: { "content-type": "text/plain" },
      data: "a body a GET should not carry",
    });
    expect(response.status()).toBe(200);
    const echo = (await response.json()) as Echo;
    expect(echo.method).toBe("GET");
    expect(echo.bodyLength).toBe(0);
  });
});

test.describe("AC-7: CSRF on mutations", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    test(`${method} with a foreign Origin → 403 and the API gets nothing`, async ({
      request,
    }) => {
      const response = await request.fetch("/api/echo/bookings", {
        method,
        headers: { origin: FOREIGN_ORIGIN, "content-type": "application/json" },
        data: "{}",
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toEqual({ error: "forbidden_origin" });
      expect(response.headers()["cache-control"]).toBe("no-store");
      expect(await lastApiRequest(request)).toBeNull();
    });
  }

  test("POST with Origin null → 403", async ({ request }) => {
    const response = await request.post("/api/echo/bookings", {
      headers: { origin: "null" },
      data: "{}",
    });
    expect(response.status()).toBe(403);
    expect(await lastApiRequest(request)).toBeNull();
  });

  test("POST without Origin nor Sec-Fetch-Site → 403", async ({ request }) => {
    const response = await request.post("/api/echo/bookings", { data: "{}" });
    expect(response.status()).toBe(403);
    expect(await lastApiRequest(request)).toBeNull();
  });

  test("POST with the front's own Origin passes", async ({ request }) => {
    const response = await request.post("/api/echo/bookings", {
      headers: { origin: FRONT_ORIGIN },
      data: "{}",
    });
    expect(response.status()).toBe(200);
    expect(((await response.json()) as Echo).method).toBe("POST");
  });

  test("POST without Origin but Sec-Fetch-Site same-origin passes", async ({
    request,
  }) => {
    const response = await request.post("/api/echo/bookings", {
      headers: { "sec-fetch-site": "same-origin" },
      data: "{}",
    });
    expect(response.status()).toBe(200);
  });

  test("GET with a foreign Origin passes", async ({ request }) => {
    const response = await request.get("/api/echo/items", {
      headers: { origin: FOREIGN_ORIGIN },
    });
    expect(response.status()).toBe(200);
    expect(((await response.json()) as Echo).headers.origin).toBe(
      FOREIGN_ORIGIN,
    );
  });
});

test.describe("AC-8: size, unavailable API and timeout", () => {
  test("body over 1 MiB → 413 without calling the API", async ({ request }) => {
    const response = await request.post("/api/echo/upload", {
      headers: { origin: FRONT_ORIGIN },
      data: Buffer.alloc(MIB + 1, "a"),
    });
    expect(response.status()).toBe(413);
    expect(await response.json()).toEqual({ error: "payload_too_large" });
    expect(await lastApiRequest(request)).toBeNull();
  });

  test("body of exactly 1 MiB passes whole", async ({ request }) => {
    const response = await request.post("/api/echo/upload", {
      headers: { origin: FRONT_ORIGIN },
      data: Buffer.alloc(MIB, "a"),
    });
    expect(response.status()).toBe(200);
    expect(((await response.json()) as Echo).bodyLength).toBe(MIB);
  });

  test("chunked body (no content-length) over 1 MiB → 413 without calling the API", async ({
    request,
  }) => {
    const response = await postChunked(MIB + 64 * 1024);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "payload_too_large" });
    expect(await lastApiRequest(request)).toBeNull();
  });

  test("chunked body (no content-length) under 1 MiB passes whole", async () => {
    const response = await postChunked(MIB - 1024);
    expect(response.status).toBe(200);
    expect(((await response.json()) as Echo).bodyLength).toBe(MIB - 1024);
  });

  test("connection reset by the API → 502", async ({ request }) => {
    const response = await request.get("/api/reset");
    expect(response.status()).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_unavailable" });
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("no answer in 10 s → 504", async ({ request }) => {
    test.setTimeout(30_000);
    const started = Date.now();
    const response = await request.get("/api/hang", { timeout: 20_000 });
    expect(response.status()).toBe(504);
    expect(await response.json()).toEqual({ error: "upstream_timeout" });
    expect(Date.now() - started).toBeGreaterThanOrEqual(10_000);
  });
});

test("a redirect from the API is not followed and its location is dropped", async ({
  request,
}) => {
  const response = await request.get("/api/redirect", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBeUndefined();
});
