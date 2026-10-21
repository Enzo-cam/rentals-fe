import { describe, expect, it } from "vitest";

import {
  clientIpFrom,
  passesCsrfCheck,
  pickRequestHeaders,
  pickResponseHeaders,
} from "./proxy-rules";

const FRONT = "https://front.example";

describe("pickRequestHeaders", () => {
  it("keeps only the allowlisted request headers", () => {
    const picked = pickRequestHeaders(
      new Headers({
        cookie: "session=1",
        "content-type": "application/json",
        accept: "application/json",
        "idempotency-key": "k-1",
        origin: FRONT,
        "user-agent": "ua",
        authorization: "Bearer x",
        "x-origin-secret": "from-client",
        "x-forwarded-for": "1.2.3.4",
        host: "front.example",
        connection: "keep-alive",
      }),
    );
    expect([...picked.keys()].sort()).toEqual([
      "accept",
      "content-type",
      "cookie",
      "idempotency-key",
      "origin",
      "user-agent",
    ]);
    expect(picked.get("cookie")).toBe("session=1");
  });
});

describe("pickResponseHeaders", () => {
  it("keeps every set-cookie and only the allowlisted headers", () => {
    const upstream = new Headers();
    upstream.append("set-cookie", "a=1; Path=/");
    upstream.append("set-cookie", "b=2; Path=/; HttpOnly");
    upstream.set("content-type", "application/json");
    upstream.set("cache-control", "no-store");
    upstream.set("retry-after", "30");
    upstream.set("location", "https://elsewhere.example");
    upstream.set("x-powered-by", "api");
    upstream.set("transfer-encoding", "chunked");

    const picked = pickResponseHeaders(upstream);

    expect(picked.getSetCookie()).toEqual([
      "a=1; Path=/",
      "b=2; Path=/; HttpOnly",
    ]);
    expect(picked.get("content-type")).toBe("application/json");
    expect(picked.get("cache-control")).toBe("no-store");
    expect(picked.get("retry-after")).toBe("30");
    expect(picked.has("location")).toBe(false);
    expect(picked.has("x-powered-by")).toBe(false);
    expect(picked.has("transfer-encoding")).toBe(false);
  });

  it("adds cache-control: no-store when the API sends none", () => {
    const upstream = new Headers({ "content-type": "application/json" });
    expect(pickResponseHeaders(upstream).get("cache-control")).toBe("no-store");
  });

  it("keeps the API's own cache-control", () => {
    const upstream = new Headers({ "cache-control": "private, max-age=5" });
    expect(pickResponseHeaders(upstream).get("cache-control")).toBe(
      "private, max-age=5",
    );
  });
});

describe("passesCsrfCheck", () => {
  it.each([
    ["POST", FRONT, null, true],
    ["PUT", FRONT, "cross-site", true],
    ["PATCH", FRONT, null, true],
    ["DELETE", FRONT, null, true],
    ["POST", "https://evil.example", null, false],
    ["POST", "https://evil.example", "same-origin", false],
    ["DELETE", "null", null, false],
    ["POST", `${FRONT}:8443`, null, false],
    ["POST", null, "same-origin", true],
    ["POST", null, "same-site", false],
    ["POST", null, "cross-site", false],
    ["POST", null, "none", false],
    ["POST", null, null, false],
    ["GET", "https://evil.example", "cross-site", true],
    ["HEAD", null, null, true],
    ["get", "https://evil.example", null, true],
  ] as const)(
    "%s with Origin %s and Sec-Fetch-Site %s → %s",
    (method, origin, secFetchSite, expected) => {
      expect(passesCsrfCheck(method, origin, secFetchSite, FRONT)).toBe(
        expected,
      );
    },
  );
});

describe("clientIpFrom", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    ["10.0.0.1, 198.51.100.2", "198.51.100.2"],
    ["10.0.0.1,198.51.100.2 ", "198.51.100.2"],
    ["10.0.0.1, ", undefined],
    ["", undefined],
    ["2001:db8::1", "2001:db8::1"],
    ["203.0.113.7, ::ffff:198.51.100.2", "::ffff:198.51.100.2"],
    ["203.0.113.7, not-an-ip", undefined],
    ["203.0.113.7, 999.1.1.1", undefined],
    ["198.51.100.2:443", undefined],
    ["<script>", undefined],
  ])("x-forwarded-for %j → %s", (header, expected) => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": header }))).toBe(
      expected,
    );
  });

  it("returns undefined without x-forwarded-for", () => {
    expect(clientIpFrom(new Headers())).toBeUndefined();
  });
});
