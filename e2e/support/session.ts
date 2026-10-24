import type { BrowserContext, Page } from "@playwright/test";

export const SESSION_COOKIE = "__Host-session";

/** The browser's own `fetch` through the proxy, so the cookie lands in the browser as it would for a real sign-in. */
export async function signInThroughProxy(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/");
  return page.evaluate(
    async ([emailValue, passwordValue]) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });
      return { status: response.status, body: await response.json() };
    },
    [email, password],
  );
}

export async function sessionCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === SESSION_COOKIE);
}

export type BrowserRequest = { url: string; headers: Record<string, string> };

/** Collects the URL and every header of what the browser sends, to prove a secret never leaves the body. */
export function trackBrowserRequests(page: Page): BrowserRequest[] {
  const seen: BrowserRequest[] = [];
  page.on("request", (request) => {
    void request.allHeaders().then((headers) => {
      seen.push({ url: request.url(), headers });
    });
  });
  return seen;
}
