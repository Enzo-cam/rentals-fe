import { expect, test } from "@playwright/test";

import { resetFakeApi } from "../support/fake-api-control";
import { sessionCookie, signInThroughProxy } from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-1: the whole session design assumes Chromium keeps a `__Host-` `Secure` cookie over http://localhost. */
test("Chromium keeps __Host-session over http://localhost and sends it back", async ({
  page,
  context,
}) => {
  const login = await signInThroughProxy(
    page,
    "ana@example.com",
    "clave de ana 1",
  );
  expect(login.status).toBe(200);

  const cookie = await sessionCookie(context);
  expect(cookie).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });

  const me = await page.evaluate(async () => {
    const response = await fetch("/api/me");
    return { status: response.status, body: await response.json() };
  });
  expect(me.status).toBe(200);
  expect(me.body).toMatchObject({ user: { name: "Ana" }, role: "owner" });
});

/** The fake must reject what the real API rejects, or a front that passes here could fail against rentals-be. */
test("the fake API rejects a body, a media type and an Origin the real one rejects", async ({
  request,
}) => {
  const url = "/api/auth/login";
  const valid = { email: "ana@example.com", password: "clave de ana 1" };
  const post = (
    data: unknown,
    headers: Record<string, string> = { "content-type": "application/json" },
  ) =>
    request.post(url, {
      headers: { origin: "http://localhost:3100", ...headers },
      data,
    });

  expect((await post({ ...valid, extra: "x" })).status()).toBe(400);
  expect((await post({ email: valid.email })).status()).toBe(400);
  expect(
    (
      await post(JSON.stringify(valid), { "content-type": "text/plain" })
    ).status(),
  ).toBe(415);
  const foreign = await request.post(url, {
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    data: valid,
  });
  expect(foreign.status()).toBe(403);
});
