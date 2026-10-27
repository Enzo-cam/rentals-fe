import { expect, test } from "@playwright/test";

import { overrideNext, resetFakeApi } from "../support/fake-api-control";
import {
  copa,
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
