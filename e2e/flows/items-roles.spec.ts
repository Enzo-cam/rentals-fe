import { expect, test } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  copa,
  ITEM_IDS,
  withoutPrice,
  pageWithoutPrices,
  silla,
  SILLA,
  tablon,
  openItemsScreen,
} from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-5 */
test("Beto, who is crew, sees the items without prices and without buttons that write", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageWithoutPrices([silla, copa, tablon], null),
  });
  await openItemsScreen(page, "/articulos");
  await expect(page.getByText(SILLA)).toBeVisible();
  await expect(page.getByRole("link", { name: "Tu cuenta" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$");
  await expect(page.getByRole("link", { name: "Nuevo artículo" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Cargar lista" })).toHaveCount(0);
});

/** AC-7 */
test("Marta, who is manager, sees the prices and Nuevo artículo", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.marta.email, USERS.marta.password);
  await openItemsScreen(page, "/articulos");
  await expect(page.getByRole("listitem").first()).toContainText("$ 1.500");
  await expect(page.getByRole("link", { name: "Cargar lista" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Nuevo artículo" }),
  ).toBeVisible();
});

/** AC-8 */
test("Olga, whose business is read only, sees the notice, the items and no buttons that write", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await openItemsScreen(page, "/articulos");
  await expect(
    page.getByText(
      "Tu negocio está en solo lectura: podés ver todo, pero no cargar ni cambiar nada. Escribinos para reactivarlo.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Silla plegable negra")).toBeVisible();
  await expect(page.getByText("$ 900")).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo artículo" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Cargar lista" })).toHaveCount(0);
});

/** AC-5 */
test("Beto sees the detail of an item without price and without buttons that write", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await overrideNext(request, {
    method: "GET",
    path: `/items/${ITEM_IDS.silla}`,
    status: 200,
    body: withoutPrice(silla),
  });
  await openItemsScreen(page, `/articulos/${ITEM_IDS.silla}`);
  await expect(page.getByRole("heading", { name: SILLA })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$");
  await expect(page.getByText("Precio de lista")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dar de baja" })).toHaveCount(
    0,
  );
});

/** AC-8 */
test("Olga sees the notice and the detail of her item, with no buttons that write", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await openItemsScreen(page, `/articulos/${ITEM_IDS.sillaNegra}`);
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
  await expect(page.getByText("$ 900")).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dar de baja" })).toHaveCount(
    0,
  );
});

/** AC-6 */
test("Beto, who opens /articulos/nuevo by URL, ends on /articulos and nothing is sent", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await page.goto("/articulos/nuevo");
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByRole("link", { name: "Tu cuenta" })).toBeVisible();
  const writes = (await apiRequests(request)).filter(
    (call) =>
      call.path.startsWith("/items") &&
      (call.method === "POST" || call.method === "PATCH"),
  );
  expect(writes).toEqual([]);
});

/** AC-8 */
test("Olga, who opens /articulos/nuevo by URL, ends on /articulos with the notice", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await page.goto("/articulos/nuevo");
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
});

/** AC-6, AC-27 */
test("Beto, who opens an edit page by URL, ends on /articulos and nothing is sent", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await page.goto(`/articulos/${ITEM_IDS.silla}/editar`);
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByRole("link", { name: "Tu cuenta" })).toBeVisible();
  const writes = (await apiRequests(request)).filter(
    (call) =>
      call.path.startsWith("/items") &&
      (call.method === "POST" || call.method === "PATCH"),
  );
  expect(writes).toEqual([]);
});

/** Derived 1 */
test("Olga, whose business is read only, is sent from an edit page to /articulos with the notice", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await page.goto(`/articulos/${ITEM_IDS.sillaNegra}/editar`);
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
});

/** AC-6, AC-37 */
test("Beto, who opens /articulos/cargar-lista by URL, ends on /articulos and nothing is sent", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await page.goto("/articulos/cargar-lista");
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByRole("link", { name: "Tu cuenta" })).toBeVisible();
  const writes = (await apiRequests(request)).filter(
    (call) => call.path.startsWith("/items") && call.method === "POST",
  );
  expect(writes).toEqual([]);
});

/** AC-37 */
test("Olga, whose business is read only, is sent from /articulos/cargar-lista to /articulos", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await page.goto("/articulos/cargar-lista");
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cargar lista" })).toHaveCount(0);
});
