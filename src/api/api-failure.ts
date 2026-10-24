/** What a failed call means for the screen, already stripped of transport details. */
export type ApiFailure =
  | { kind: "network" }
  | { kind: "unavailable"; status: number }
  | { kind: "rate_limited"; retryAfterSeconds: number | null }
  | { kind: "unauthenticated" }
  | { kind: "rejected"; status: number; code: string | null };

export class ApiError extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure) {
    super(failure.kind);
    this.name = "ApiError";
    this.failure = failure;
  }
}

function codeOf(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }
  return typeof body.error === "string" ? body.error : null;
}

/**
 * Only a 401 with the `unauthenticated` code means the session is gone: `invalid_credentials` and `invalid_token`
 * are also 401s and must stay on their screen, or the sign-in would reload in a loop.
 */
export function toApiFailure(
  status: number,
  body: unknown,
  retryAfter: string | null,
): ApiFailure {
  if (status >= 500) return { kind: "unavailable", status };
  if (status === 429) {
    return {
      kind: "rate_limited",
      retryAfterSeconds: parseRetryAfter(retryAfter),
    };
  }
  const code = codeOf(body);
  if (status === 401 && code === "unauthenticated") {
    return { kind: "unauthenticated" };
  }
  return { kind: "rejected", status, code };
}

/** Whole seconds only; an HTTP date or anything else is not trusted and gives `null`. */
export function parseRetryAfter(value: string | null): number | null {
  return value !== null && /^\d+$/.test(value) ? Number(value) : null;
}

export function retryAfterMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

type Call<T> = Promise<{ data?: T; error?: unknown; response: Response }>;

/** Resolves with the data (`undefined` for a 204) or throws an `ApiError`. A failed fetch or a timeout is `network`. */
export async function unwrap<T>(call: Call<T>): Promise<T> {
  let result: Awaited<Call<T>>;
  try {
    result = await call;
  } catch {
    throw new ApiError({ kind: "network" });
  }
  const { data, error, response } = result;
  if (!response.ok) {
    throw new ApiError(
      toApiFailure(response.status, error, response.headers.get("retry-after")),
    );
  }
  return data as T;
}

/** The session is dead or has no business: a screen of the session is about to be left, so it is not an error. */
export function isLeavingSession(failure: ApiFailure | null): boolean {
  return (
    failure?.kind === "unauthenticated" ||
    (failure?.kind === "rejected" && failure.code === "business_not_selected")
  );
}

export function failureOf(error: unknown): ApiFailure | null {
  return error instanceof ApiError ? error.failure : null;
}
