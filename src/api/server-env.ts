export type ServerEnv = {
  apiUrl: string;
  originSecret: string;
  frontOrigin: string;
};

const VARIABLES = {
  apiUrl: "API_URL",
  originSecret: "ORIGIN_SECRET",
  frontOrigin: "FRONT_ORIGIN",
} as const;

export class ServerEnvError extends Error {
  constructor(
    readonly variable: string,
    readonly problem: "missing" | "invalid",
  ) {
    super(
      `${problem === "missing" ? "Missing" : "Invalid"} server environment variable: ${variable}`,
    );
    this.name = "ServerEnvError";
  }
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

/** Normalized value, or undefined if it is not valid for that setting. */
function validate(key: keyof ServerEnv, value: string): string | undefined {
  switch (key) {
    case "apiUrl": {
      const url = parseUrl(value);
      const isHttp = url?.protocol === "http:" || url?.protocol === "https:";
      // Paths are appended to it: no query or fragment (also a bare "?" or "#").
      const hasQueryOrHash = !!url?.search || !!url?.hash || /[?#]/.test(value);
      return isHttp && !hasQueryOrHash ? value.replace(/\/+$/, "") : undefined;
    }
    case "frontOrigin":
      return parseUrl(value)?.origin === value ? value : undefined;
    case "originSecret":
      return value;
  }
}

/**
 * Reads the requested server-only settings (all of them by default). The error
 * names the missing or invalid variable, never a value.
 */
export function parseServerEnv<K extends keyof ServerEnv = keyof ServerEnv>(
  env: Record<string, string | undefined>,
  keys: readonly K[] = Object.keys(VARIABLES) as K[],
): Pick<ServerEnv, K> {
  const parsed = {} as Pick<ServerEnv, K>;
  for (const key of keys) {
    const name = VARIABLES[key];
    const raw = env[name]?.trim();
    if (!raw) throw new ServerEnvError(name, "missing");
    const value = validate(key, raw);
    if (value === undefined) throw new ServerEnvError(name, "invalid");
    parsed[key] = value as ServerEnv[K];
  }
  return parsed;
}
