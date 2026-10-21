import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_API_PORT ?? 4010);
const SECRET = process.env.ORIGIN_SECRET;
const HEALTH_MODES = ["ok", "down", "hang", "reset", "badbody", "notfound"];
const HANG_MS = 15_000;

let healthMode = "ok";
let lastRequest = null;

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

function control(req, res, path) {
  if (path === "/__control/ping") return json(res, 200, { ok: true });
  if (path === "/__control/last") return json(res, 200, { lastRequest });
  if (req.method === "POST" && path === "/__control/reset") {
    healthMode = "ok";
    lastRequest = null;
    return json(res, 200, { ok: true });
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
