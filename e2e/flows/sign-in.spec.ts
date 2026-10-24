import { expect, test } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  fillSignIn,
  N1,
  N2,
  N2_ID,
  openScreen,
  sessionCookie,
  USERS,
} from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-11: the content of /cuenta is checked in account.spec.ts. */
test("Ana signs in and lands on /cuenta", async ({ page }) => {
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.ana.email, USERS.ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/cuenta");
});

/** AC-13 */
test("a wrong password shows the error, keeps what was typed and sets no cookie", async ({
  page,
  context,
}) => {
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.ana.email, "otra clave 9");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "El email o la contraseña no son correctos.",
  );
  await expect(page.getByLabel("Email")).toHaveValue(USERS.ana.email);
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue(
    "otra clave 9",
  );
  expect(await sessionCookie(context)).toBeUndefined();
});

/** AC-14 */
test("a user with no active business sees why", async ({ page }) => {
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.nora.email, USERS.nora.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Tu usuario no está activo en ningún negocio. Escribinos para revisarlo.",
  );
});

/** AC-15: the other Retry-After values are covered by Vitest. */
test("a 429 with Retry-After 125 asks to wait 3 minutes", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/auth/login",
    status: 429,
    body: { error: "too_many_attempts" },
    headers: { "retry-after": "125" },
  });
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.ana.email, USERS.ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Hubo demasiados intentos. Probá de nuevo en 3 minutos.",
  );
});

/** AC-16 */
test("a 502 shows the system is down, and trying again signs in", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/auth/login",
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.ana.email, USERS.ana.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "El sistema no está respondiendo. Probá de nuevo en unos minutos.",
  );

  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/cuenta");
});

/** AC-12 */
test("Juan, with two businesses, picks one and /cuenta shows it", async ({
  page,
  request,
}) => {
  await openScreen(page, "/ingresar");
  await fillSignIn(page, USERS.juan.email, USERS.juan.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL("**/elegir-negocio");
  await expect(
    page.getByRole("button", { name: `${N1} · Encargado` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `${N2} · Dueño` }).click();

  await page.waitForURL("**/cuenta");
  await expect(page.getByText(N2, { exact: true })).toBeVisible();
  await expect(page.getByText("Dueño", { exact: true })).toBeVisible();
  const selected = (await apiRequests(request)).find(
    (call) => call.path === "/auth/select-business",
  );
  expect(JSON.parse(selected?.body ?? "")).toEqual({ businessId: N2_ID });
});
