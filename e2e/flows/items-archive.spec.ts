import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import { COPA, ITEM_IDS, LIVING, openItemsScreen } from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

const READ_ONLY =
  "No se guardó: tu negocio está en solo lectura. Escribinos para reactivarlo.";
const MISSING = "Este artículo no existe o no es de tu negocio.";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

async function calls(request: APIRequestContext, method: string, path: string) {
  return (await apiRequests(request)).filter(
    (call) => call.method === method && call.path === path,
  );
}

const archiveButton = (page: Page) =>
  page.getByRole("button", { name: "Dar de baja", exact: true });

/** AC-28 */
test("Dar de baja asks first, Cancelar sends nothing", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, `/articulos/${ITEM_IDS.copa}`);
  await archiveButton(page).click();
  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByRole("heading", { name: `¿Dar de baja «${COPA}»?` }),
  ).toBeVisible();
  await expect(
    dialog.getByText("No se borra: lo podés reactivar cuando quieras."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    await calls(request, "POST", `/items/${ITEM_IDS.copa}/archive`),
  ).toHaveLength(0);
});

/** AC-28 */
test("confirming sends the POST as JSON without a body, shows Dado de baja and asks the list again", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, `/articulos/${ITEM_IDS.copa}`);
  await archiveButton(page).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Dar de baja" })
    .click();
  await expect(page.getByText("Dado de baja", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivar" })).toBeVisible();

  const sent = await calls(request, "POST", `/items/${ITEM_IDS.copa}/archive`);
  expect(sent).toHaveLength(1);
  expect(sent[0].headers["content-type"]).toContain("application/json");
  expect(sent[0].body).toBeNull();

  const before = (await calls(request, "GET", "/items")).length;
  await page.getByRole("link", { name: "Volver a los artículos" }).click();
  await page.waitForURL("**/articulos");
  await expect(page.getByRole("listitem").first()).toBeVisible();
  await expect
    .poll(async () => (await calls(request, "GET", "/items")).length)
    .toBe(before + 1);
});

/** AC-29 */
test("Reactivar sends the POST as JSON, with no dialog, and the button turns into Dar de baja", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, `/articulos/${ITEM_IDS.living}`);
  await expect(page.getByText("Dado de baja", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reactivar" }).click();
  await expect(archiveButton(page)).toBeVisible();
  await expect(page.getByText("Dado de baja", { exact: true })).toHaveCount(0);

  const sent = await calls(
    request,
    "POST",
    `/items/${ITEM_IDS.living}/reactivate`,
  );
  expect(sent).toHaveLength(1);
  expect(sent[0].headers["content-type"]).toContain("application/json");
  expect(sent[0].body).toBeNull();
});

/** AC-15, AC-29 */
test("the taken name of an archived item offers Reactivar and goes to its detail", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 409,
    body: {
      error: "item_name_taken",
      item: { id: ITEM_IDS.living, name: LIVING, archived: true },
    },
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(LIVING);
  await page.getByLabel("Stock total", { exact: true }).fill("2");
  await page.getByLabel("Precio de lista", { exact: true }).fill("45000");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("button", { name: `Reactivar «${LIVING}»` }).click();
  await page.waitForURL(`**/articulos/${ITEM_IDS.living}`);
  await expect(archiveButton(page)).toBeVisible();

  const sent = await calls(
    request,
    "POST",
    `/items/${ITEM_IDS.living}/reactivate`,
  );
  expect(sent).toHaveLength(1);
  expect(sent[0].headers["content-type"]).toContain("application/json");
});

/** AC-30 */
test("a 403 read_only shows its text and the item stays active", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: `/items/${ITEM_IDS.copa}/archive`,
    status: 403,
    body: { error: "read_only" },
  });
  await openItemsScreen(page, `/articulos/${ITEM_IDS.copa}`);
  await archiveButton(page).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Dar de baja" })
    .click();
  await expect(page.getByText(READ_ONLY)).toBeVisible();
  await expect(page.getByText("Dado de baja", { exact: true })).toHaveCount(0);
});

/** AC-30 */
test("a 404 says that the item does not exist", async ({ page, request }) => {
  await overrideNext(request, {
    method: "POST",
    path: `/items/${ITEM_IDS.copa}/archive`,
    status: 404,
    body: { error: "item_not_found" },
  });
  await openItemsScreen(page, `/articulos/${ITEM_IDS.copa}`);
  await archiveButton(page).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Dar de baja" })
    .click();
  await expect(page.getByText(MISSING)).toBeVisible();
});

/** AC-30 */
test("while the POST travels the button is disabled", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: `/items/${ITEM_IDS.copa}/archive`,
    delayMs: 1500,
  });
  await openItemsScreen(page, `/articulos/${ITEM_IDS.copa}`);
  await archiveButton(page).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Dar de baja" })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(archiveButton(page)).toBeDisabled();
  await expect(page.getByText("Dado de baja", { exact: true })).toBeVisible();
  expect(
    await calls(request, "POST", `/items/${ITEM_IDS.copa}/archive`),
  ).toHaveLength(1);
});
