import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import { COPA, ITEM_IDS, openItemsScreen, SILLA } from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

const EDIT_SILLA = `/articulos/${ITEM_IDS.silla}/editar`;
const OUT_OF_SERVICE_TEXT =
  "No puede haber más unidades fuera de servicio que el stock total.";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

async function patches(request: APIRequestContext) {
  return (await apiRequests(request)).filter((call) => call.method === "PATCH");
}

const field = (page: import("@playwright/test").Page, label: string) =>
  page.getByLabel(label, { exact: true });

/** AC-26 */
test("the form opens with the item, the price as pesos", async ({ page }) => {
  await openItemsScreen(page, EDIT_SILLA);
  await expect(field(page, "Nombre")).toHaveValue(SILLA);
  await expect(field(page, "Stock total")).toHaveValue("120");
  await expect(field(page, "Fuera de servicio")).toHaveValue("4");
  await expect(field(page, "Precio de lista")).toHaveValue("1.500");
  await expect(field(page, "Categoría")).toHaveValue("Mobiliario");
  await expect(field(page, "Código")).toHaveValue("SIL-01");
  await expect(field(page, "Descripción")).toHaveValue("");
});

/** AC-26 */
test("changing only the price sends only the price and goes back to the detail", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, `/articulos/${ITEM_IDS.silla}`);
  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForURL(`**${EDIT_SILLA}`);
  await field(page, "Precio de lista").fill("1.800");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(`**/articulos/${ITEM_IDS.silla}`);
  await expect(page.getByText("$ 1.800")).toBeVisible();

  const sent = await patches(request);
  expect(sent).toHaveLength(1);
  expect(sent[0].path).toBe(`/items/${ITEM_IDS.silla}`);
  expect(sent[0].headers["content-type"]).toContain("application/json");
  expect(sent[0].body).toBe('{"priceCents":180000}');
});

/** AC-26 */
test("clearing the category sends null", async ({ page, request }) => {
  await openItemsScreen(page, EDIT_SILLA);
  await field(page, "Categoría").fill("");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(`**/articulos/${ITEM_IDS.silla}`);
  expect((await patches(request))[0].body).toBe('{"category":null}');
});

/** AC-26 */
test("no changes, or a space at the end of the name, send nothing and say so", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, EDIT_SILLA);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("No cambiaste nada.")).toBeVisible();

  await field(page, "Nombre").fill(`${SILLA} `);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("No cambiaste nada.")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${EDIT_SILLA}$`));
  expect(await patches(request)).toHaveLength(0);
});

/** AC-27 */
test("a 400 out_of_service_exceeds_stock shows under Fuera de servicio and keeps the values", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "PATCH",
    path: `/items/${ITEM_IDS.silla}`,
    status: 400,
    body: { error: "out_of_service_exceeds_stock" },
  });
  await openItemsScreen(page, EDIT_SILLA);
  await field(page, "Stock total").fill("3");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(OUT_OF_SERVICE_TEXT)).toBeVisible();
  await expect(field(page, "Stock total")).toHaveValue("3");
  expect((await patches(request))[0].body).toBe('{"totalStock":3}');
});

/** AC-27 */
test("a taken name shows the text and the link to the item that has it", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "PATCH",
    path: `/items/${ITEM_IDS.silla}`,
    status: 409,
    body: {
      error: "item_name_taken",
      item: { id: ITEM_IDS.copa, name: COPA, archived: false },
    },
  });
  await openItemsScreen(page, EDIT_SILLA);
  await field(page, "Nombre").fill(COPA);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByText("Ya tenés un artículo con este nombre."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Ver «${COPA}»` }),
  ).toHaveAttribute("href", `/articulos/${ITEM_IDS.copa}`);
});

/** AC-27 */
test("an item that does not exist says so, with no form", async ({ page }) => {
  await openItemsScreen(
    page,
    "/articulos/bbbbbbbb-0000-4000-8000-0000000000ff/editar",
  );
  await expect(
    page.getByText("Este artículo no existe o no es de tu negocio."),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Volver a los artículos" }),
  ).toBeVisible();
});
