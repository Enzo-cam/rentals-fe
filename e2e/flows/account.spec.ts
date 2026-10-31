import { expect, test } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  fillSignIn,
  N1,
  openScreen,
  sessionCookie,
  signInThroughProxy,
  USERS,
} from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-11 */
test("/cuenta shows who Ana is, her business and her role", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await page.goto("/cuenta");
  await expect(page.getByRole("heading", { name: "Tu cuenta" })).toBeVisible();
  await expect(page.getByText("Ana", { exact: true })).toBeVisible();
  await expect(page.getByText(N1)).toBeVisible();
  await expect(page.getByText("Dueño", { exact: true })).toBeVisible();
});

/** AC-18 */
test("a 401 from /me sends to /ingresar", async ({ page, request }) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 401,
    body: { error: "unauthenticated" },
  });
  await page.goto("/cuenta");
  await page.waitForURL("**/ingresar");
});

/** AC-18 */
test("a 403 business_not_selected from /me sends to /elegir-negocio", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 403,
    body: { error: "business_not_selected" },
  });
  await page.goto("/cuenta");
  await page.waitForURL("**/elegir-negocio");
});

/** AC-19 */
test("Salir clears the session, and the next user never sees the previous one", async ({
  page,
  context,
  request,
}) => {
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.ana.email, USERS.ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/articulos");
  await page.getByRole("link", { name: "Cuenta", exact: true }).click();
  await expect(page.getByText("Ana", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL("**/ingresar");
  expect(await sessionCookie(context)).toBeUndefined();
  const logout = (await apiRequests(request)).find(
    (call) => call.path === "/auth/logout",
  );
  expect(logout?.method).toBe("POST");
  expect(logout?.headers["content-type"]).toBe("application/json");

  await overrideNext(request, { method: "GET", path: "/me", delayMs: 1500 });
  await fillSignIn(page, USERS.beto.email, USERS.beto.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/articulos");
  await page.getByRole("link", { name: "Cuenta", exact: true }).click();
  await page.waitForURL("**/cuenta");
  await expect(page.getByText("Ana", { exact: true })).toHaveCount(0);
  await expect(page.getByText(N1)).toHaveCount(0);
  await expect(page.getByText("Reparto", { exact: true })).toBeVisible();
  await expect(page.getByText("Beto", { exact: true })).toBeVisible();
});
