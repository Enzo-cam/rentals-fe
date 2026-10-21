import "server-only";

import {
  clientIpFrom,
  passesCsrfCheck,
  pickRequestHeaders,
  pickResponseHeaders,
} from "./proxy-rules";
import { readBoundedBody } from "./read-bounded-body";
import { parseServerEnv, type ServerEnv } from "./server-env";

const MAX_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;
/** Deadline to receive the whole client body (slow clients), same as upstream. */
const CLIENT_BODY_TIMEOUT_MS = UPSTREAM_TIMEOUT_MS;
const PROXY_PREFIX = "/api";
const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

type ProxyError =
  | "proxy_misconfigured"
  | "forbidden_origin"
  | "payload_too_large"
  | "bad_request_body"
  | "request_timeout"
  | "upstream_unavailable"
  | "upstream_timeout";

function proxyError(status: number, error: ProxyError): Response {
  return Response.json(
    { error },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function errorName(error: unknown): string {
  return error instanceof Error || error instanceof DOMException
    ? error.name
    : "UnknownError";
}

/**
 * Same-origin BFF proxy (ADR-0001): forwards `/api/<path>` to `API_URL/<path>`.
 * It never interprets the API's answer (INV-FE-01): status and body go back as
 * they came, with only the allowed headers.
 */
export async function proxyToApi(request: Request): Promise<Response> {
  let env: ServerEnv;
  try {
    env = parseServerEnv(process.env);
  } catch (error) {
    // The message names the variable, never its value.
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(`[bff-proxy] proxy_misconfigured: ${detail}`);
    return proxyError(500, "proxy_misconfigured");
  }

  const method = request.method.toUpperCase();
  if (
    !passesCsrfCheck(
      method,
      request.headers.get("origin"),
      request.headers.get("sec-fetch-site"),
      env.frontOrigin,
    )
  ) {
    return proxyError(403, "forbidden_origin");
  }

  // GET and HEAD go upstream without a body, whatever the client sent.
  let body: Blob | undefined;
  if (request.body && !METHODS_WITHOUT_BODY.has(method)) {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return proxyError(413, "payload_too_large");
    }
    const read = await readBoundedBody(
      request.body,
      MAX_BODY_BYTES,
      CLIENT_BODY_TIMEOUT_MS,
    );
    if (read.kind === "too_large") {
      return proxyError(413, "payload_too_large");
    }
    if (read.kind === "bad_body") return proxyError(400, "bad_request_body");
    if (read.kind === "timeout") return proxyError(408, "request_timeout");
    body = read.body;
  }

  const url = new URL(request.url);
  const path = url.pathname.slice(PROXY_PREFIX.length) || "/";
  const headers = pickRequestHeaders(request.headers);
  headers.set("x-origin-secret", env.originSecret);
  const clientIp = clientIpFrom(request.headers);
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  let upstream: Response;
  let upstreamBody: ArrayBuffer;
  try {
    upstream = await fetch(`${env.apiUrl}${path}${url.search}`, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    upstreamBody = await upstream.arrayBuffer();
  } catch (error) {
    const name = errorName(error);
    if (name === "TimeoutError") {
      console.error(`[bff-proxy] upstream_timeout ${method}`);
      return proxyError(504, "upstream_timeout");
    }
    console.error(`[bff-proxy] upstream_unavailable ${method}: ${name}`);
    return proxyError(502, "upstream_unavailable");
  }

  return new Response(upstreamBody.byteLength > 0 ? upstreamBody : null, {
    status: upstream.status,
    headers: pickResponseHeaders(upstream.headers),
  });
}
