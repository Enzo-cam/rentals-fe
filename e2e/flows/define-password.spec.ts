import { expect, test } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  linkToken,
  N1,
  openScreen,
  passwordLink,
  sessionCookie,
  trackBrowserRequests,
} from "../support/session";

const VALID = "mesas y sillas";
const INCOMPLETE =
  "A este link le falta una parte. Abrí de nuevo el link que te mandamos por WhatsApp, completo.";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

async function submit(page: import("@playwright/test").Page, password = VALID) {
  await page.getByLabel("Contraseña nueva").fill(password);
  await page.getByLabel("Repetí la contraseña").fill(password);
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
}

/** AC-2 and AC-3 */
test("Carla defines her password, lands on /cuenta and the token only travels in the body", async ({
  page,
  context,
  request,
}) => {
  const browserRequests = trackBrowserRequests(page);
  await openScreen(page, passwordLink("carla"));
  await submit(page);

  await page.waitForURL("**/articulos");
  await page.goto("/cuenta");
  await expect(page.getByText("Carla", { exact: true })).toBeVisible();
  await expect(page.getByText(N1)).toBeVisible();
  await expect(page.getByText("Encargado", { exact: true })).toBeVisible();
  expect(await sessionCookie(context)).toBeDefined();

  const calls = (await apiRequests(request)).filter(
    (call) => call.path === "/auth/password",
  );
  expect(calls).toHaveLength(1);
  expect(JSON.parse(calls[0].body ?? "")).toEqual({
    token: linkToken("carla"),
    password: VALID,
  });

  expect(page.url()).not.toContain("token");
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
  await page.goBack();
  expect(page.url()).not.toContain("token");

  const token = linkToken("carla");
  expect(browserRequests.length).toBeGreaterThan(0);
  for (const sent of browserRequests) {
    expect(sent.url).not.toContain(token);
    expect(JSON.stringify(sent.headers)).not.toContain(token);
  }
  for (const call of await apiRequests(request)) {
    expect(call.path + call.query).not.toContain(token);
    expect(JSON.stringify(call.headers)).not.toContain(token);
  }
});

/** AC-4: the front does not validate the policy, the API does. */
test("a short password reaches the API, keeps the form and the token, and a valid one enters", async ({
  page,
  request,
}) => {
  await openScreen(page, passwordLink("carla"));
  await submit(page, "corta");
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
  const first = (await apiRequests(request)).filter(
    (call) => call.path === "/auth/password",
  );
  expect(first).toHaveLength(1);
  expect(JSON.parse(first[0].body ?? "").password).toBe("corta");
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "La contraseña tiene que tener entre 8 y 128 caracteres y al menos uno que no sea letra ni número (un espacio o un signo sirven).",
  );
  expect(page.url()).toContain(`#token=${linkToken("carla")}`);

  await submit(page);
  await page.waitForURL("**/articulos");
});

/** AC-5 */
test("a used link says so, offers /ingresar and leaves no fragment", async ({
  page,
  context,
}) => {
  await openScreen(page, passwordLink("usado"));
  await submit(page);

  await expect(
    page.getByText(
      "Este link ya no sirve: puede que ya lo hayas usado o que haya vencido (dura 24 horas).",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Entrar con tu email" }),
  ).toHaveAttribute("href", "/ingresar");
  expect(await sessionCookie(context)).toBeUndefined();
  expect(page.url()).not.toContain("#");
});

/** AC-6 */
test("a user with no business is told the password was saved, with no session", async ({
  page,
  context,
}) => {
  await openScreen(page, passwordLink("elena"));
  await submit(page);
  await expect(
    page.getByText(
      "Guardamos tu contraseña, pero tu usuario no está activo en ningún negocio. Escribinos para revisarlo.",
    ),
  ).toBeVisible();
  expect(await sessionCookie(context)).toBeUndefined();
});

/** AC-7 */
test("a link without a token shows the incomplete text, no form and no request", async ({
  page,
  request,
}) => {
  for (const path of [
    "/definir-contrasena",
    "/definir-contrasena#token=",
    "/definir-contrasena#otra=1",
  ]) {
    await openScreen(page, path);
    await expect(page.getByText(INCOMPLETE)).toBeVisible();
    await expect(page.getByLabel("Contraseña nueva")).toHaveCount(0);
  }
  const sent = (await apiRequests(request)).filter(
    (call) => call.path === "/auth/password",
  );
  expect(sent).toEqual([]);
});

/** AC-8 */
test("two different passwords are not sent", async ({ page, request }) => {
  await openScreen(page, passwordLink("carla"));
  await page.getByLabel("Contraseña nueva").fill(VALID);
  await page.getByLabel("Repetí la contraseña").fill("otra distinta 1");
  await page.getByRole("button", { name: "Guardar y entrar" }).click();

  await expect(
    page.getByText("Las dos contraseñas no coinciden."),
  ).toBeVisible();
  expect(
    (await apiRequests(request)).filter(
      (call) => call.path === "/auth/password",
    ),
  ).toEqual([]);
});

/** AC-9 */
test("a double click plus Enter, with a slow API, send a single request", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/auth/password",
    delayMs: 1000,
  });
  await openScreen(page, passwordLink("carla"));
  await page.getByLabel("Contraseña nueva").fill(VALID);
  await page.getByLabel("Repetí la contraseña").fill(VALID);
  await page.getByRole("button", { name: "Guardar y entrar" }).dblclick();
  await page.getByLabel("Repetí la contraseña").press("Enter");

  await page.waitForURL("**/articulos");
  const sent = (await apiRequests(request)).filter(
    (call) => call.path === "/auth/password",
  );
  expect(sent).toHaveLength(1);
});

/** AC-9: two submits in the same tick, before React can re-render. */
test("two submits in the same tick send a single request", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/auth/password",
    delayMs: 1000,
  });
  await openScreen(page, passwordLink("carla"));
  await page.getByLabel("Contraseña nueva").fill(VALID);
  await page.getByLabel("Repetí la contraseña").fill(VALID);
  await page.evaluate(() => {
    const form = document.querySelector("form");
    form?.requestSubmit();
    form?.requestSubmit();
  });

  await page.waitForURL("**/articulos");
  const sent = (await apiRequests(request)).filter(
    (call) => call.path === "/auth/password",
  );
  expect(sent).toHaveLength(1);
});

/** AC-10 */
test("a user with two businesses goes to /elegir-negocio", async ({ page }) => {
  await openScreen(page, passwordLink("dario"));
  await submit(page);
  await page.waitForURL("**/elegir-negocio");
});
