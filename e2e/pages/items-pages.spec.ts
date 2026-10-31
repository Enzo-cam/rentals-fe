import { expect, test } from "@playwright/test";

import { overrideNext, resetFakeApi } from "../support/fake-api-control";
import { expectPrivatePage } from "../support/private-page";
import {
  IMPORT_TEXT,
  ITEM_IDS,
  markedPreview,
  openItemsScreen,
  TABLON,
} from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-22: INV-FE-03 and 360 px, with the longest item name of the fixtures on screen. */
test("/articulos is Spanish, not indexable and fits in 360 px", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, "/articulos");
  await page.getByRole("listitem").nth(2).waitFor();
  await expectPrivatePage(page);
});

/** AC-22 */
test("the detail of the longest item name is Spanish, not indexable and fits in 360 px", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, `/articulos/${ITEM_IDS.tablon}`);
  await expect(page.getByRole("heading", { name: TABLON })).toBeVisible();
  await expectPrivatePage(page);
});

/** AC-22 */
test("/articulos/nuevo is Spanish, not indexable and fits in 360 px", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, "/articulos/nuevo");
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await expectPrivatePage(page);
});

/** AC-22 */
test("the edit page of the longest item name is Spanish, not indexable and fits in 360 px", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, `/articulos/${ITEM_IDS.tablon}/editar`);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(TABLON);
  await expectPrivatePage(page);
});

/** AC-22, AC-38 */
test("/articulos/cargar-lista with a preview on screen is Spanish, not indexable and fits in 360 px", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await overrideNext(request, {
    method: "POST",
    path: "/items/import/preview",
    status: 200,
    body: markedPreview,
  });
  await openItemsScreen(page, "/articulos/cargar-lista");
  await page
    .getByLabel("Lista de artículos", { exact: true })
    .fill(IMPORT_TEXT);
  await page.getByRole("button", { name: "Ver vista previa" }).click();
  await expect(
    page.getByText("4 filas: 1 bien y 3 con errores."),
  ).toBeVisible();
  await expectPrivatePage(page);
});
