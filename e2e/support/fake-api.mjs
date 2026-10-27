import { createServer } from "node:http";

import { createItemsApi, isItemsPath } from "./fake-items-api.mjs";
import { SESSION_PATHS, createSessionApi } from "./fake-session-api.mjs";

const PORT = Number(process.env.FAKE_API_PORT ?? 4010);
const SECRET = process.env.ORIGIN_SECRET;
const HEALTH_MODES = ["ok", "down", "hang", "reset", "badbody", "notfound"];
const HANG_MS = 15_000;

const sessionApi = createSessionApi({
  frontOrigin: process.env.FRONT_ORIGIN ?? "http://localhost:3100",
});
const itemsApi = createItemsApi({ accessOf: sessionApi.accessOf });

let healthMode = "ok";
let lastRequest = null;
let requests = [];
let overrides = [];

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function hang(req, res) {
  const timer = setTimeout(() => res.destroy(), HANG_MS);
  req.on("close", () => clearTimeout(timer));
}

async function readBody(req) {
  let length = 0;
  for await (const chunk of req) length += chunk.length;
  return length;
}

async function readText(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/** Takes the first matching override (its `query`, if any, has to be in the URL) and uses up one of its `times`. */
function takeOverride(method, path, url) {
  const index = overrides.findIndex(
    (candidate) =>
      candidate.method === method &&
      candidate.path === path &&
      Object.entries(candidate.query ?? {}).every(
        ([name, value]) => url.searchParams.get(name) === value,
      ),
  );
  if (index === -1) return null;
  const found = overrides[index];
  found.times -= 1;
  if (found.times <= 0) overrides.splice(index, 1);
  return found;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Records the request and applies the overrides before the `api` that owns the path answers. */
async function viaApi(api, req, res, path, url) {
  const entry = {
    method: req.method,
    path,
    query: url.search,
    headers: req.headers,
    body: null,
  };
  requests.push(entry);
  const text = await readText(req);
  entry.body = text === "" ? null : text;

  const override = takeOverride(req.method, path, url);
  if (override?.delayMs) await wait(override.delayMs);
  if (override?.mode === "reset") return req.socket.destroy();
  if (override?.status !== undefined) {
    return json(res, override.status, override.body ?? {}, override.headers);
  }
  return api.handle(req, res, path, text);
}

function control(req, res, path) {
  if (path === "/__control/ping") return json(res, 200, { ok: true });
  if (path === "/__control/last") return json(res, 200, { lastRequest });
  if (path === "/__control/requests") return json(res, 200, { requests });
  if (req.method === "POST" && path === "/__control/reset") {
    healthMode = "ok";
    lastRequest = null;
    requests = [];
    overrides = [];
    sessionApi.reset();
    return json(res, 200, { ok: true });
  }
  if (req.method === "POST" && path === "/__control/override") {
    return readText(req).then((text) => {
      overrides.push({ times: 1, ...JSON.parse(text) });
      return json(res, 200, { ok: true });
    });
  }
  const mode = path.match(/^\/__control\/health\/(\w+)$/)?.[1];
  if (req.method === "POST" && HEALTH_MODES.includes(mode)) {
    healthMode = mode;
    return json(res, 200, { healthMode });
  }
  return json(res, 404, { error: "unknown_control" });
}

function health(req, res) {
  switch (healthMode) {
    case "ok":
      return json(res, 200, { status: "ok" }, { "cache-control": "no-store" });
    case "down":
      return json(
        res,
        503,
        { status: "unavailable" },
        { "cache-control": "no-store" },
      );
    case "hang":
      return hang(req, res);
    case "reset":
      return req.socket.destroy();
    case "badbody":
      res.writeHead(200, { "content-type": "application/json" });
      return res.end("{not json");
    case "notfound":
      return json(res, 404, { error: "not_found" });
  }
}

/** @see docs/architecture.md §9 (network that leaves the Next server) */
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname;
  if (path.startsWith("/__control/")) return control(req, res, path);

  lastRequest = { method: req.method, path, headers: req.headers };
  if (path === "/health") return health(req, res);
  if (!SECRET || req.headers["x-origin-secret"] !== SECRET) {
    return json(res, 404, { error: "not_found" });
  }

  if (SESSION_PATHS.has(path)) {
    return viaApi(sessionApi, req, res, path, url);
  }
  if (isItemsPath(path)) return viaApi(itemsApi, req, res, path, url);

  if (path.startsWith("/echo")) {
    const bodyLength = await readBody(req);
    return json(
      res,
      200,
      {
        method: req.method,
        path,
        query: url.search,
        headers: req.headers,
        bodyLength,
      },
      {
        "set-cookie": ["session=abc; Path=/; HttpOnly", "theme=dark; Path=/"],
        "cache-control": "private, max-age=5",
        "retry-after": "7",
        "x-upstream-extra": "should-not-pass",
      },
    );
  }
  if (path === "/hang") return hang(req, res);
  if (path === "/reset") return req.socket.destroy();
  if (path === "/redirect") {
    res.writeHead(302, { location: "http://example.com/elsewhere" });
    return res.end();
  }
  return json(res, 404, { error: "not_found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`fake-api listening on http://127.0.0.1:${PORT}`);
});
