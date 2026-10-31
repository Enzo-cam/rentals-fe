import { expect, test, type Page } from "@playwright/test";

import { apiRequests, resetFakeApi } from "../support/fake-api-control";
import { ITEM_IDS, LIVING, openItemsScreen, SILLA } from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

function valueOf(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::dd");
}

const MISSING = "Este artículo no existe o no es de tu negocio.";

/** AC-9 */
test("tapping a row opens the detail with every field", async ({ page }) => {
  await openItemsScreen(page, "/articulos");
  await page.getByRole("link", { name: new RegExp(SILLA) }).click();
  await page.waitForURL(`**/articulos/${ITEM_IDS.silla}`);
  await expect(page.getByRole("heading", { name: SILLA })).toBeVisible();
  await expect(valueOf(page, "Stock total")).toHaveText("120");
  await expect(valueOf(page, "Fuera de servicio")).toHaveText("4");
  await expect(valueOf(page, "Precio de lista")).toHaveText("$ 1.500");
  await expect(valueOf(page, "Categoría")).toHaveText("Mobiliario");
  await expect(valueOf(page, "Código")).toHaveText("SIL-01");
  await expect(valueOf(page, "Descripción")).toHaveText("Sin descripción");
  await expect(page.getByText("Dado de baja")).toHaveCount(0);
});

/** AC-9 */
test("the detail of an archived item says Dado de baja, and empty fields say so", async ({
  page,
}) => {
  await openItemsScreen(page, `/articulos/${ITEM_IDS.living}`);
  await expect(page.getByRole("heading", { name: LIVING })).toBeVisible();
  await expect(page.getByText("Dado de baja")).toBeVisible();
  await openItemsScreen(page, `/articulos/${ITEM_IDS.tablon}`);
  await expect(valueOf(page, "Categoría")).toHaveText("Sin categoría");
  await expect(valueOf(page, "Código")).toHaveText("Sin código");
});

/** AC-10 */
for (const [name, id, status] of [
  ["an unknown uuid", "bbbbbbbb-0000-4000-8000-0000000000ff", 404],
  ["an id that is not a uuid", "abc", 400],
] as const) {
  test(`${name} (${status}) says the item does not exist, with a way back and no retry`, async ({
    page,
    request,
  }) => {
    await openItemsScreen(page, `/articulos/${id}`);
    await expect(page.getByText(MISSING)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Volver a los artículos" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(
      0,
    );
    await page.waitForTimeout(1500);
    const calls = (await apiRequests(request)).filter(
      (call) => call.method === "GET" && call.path === `/items/${id}`,
    );
    expect(calls).toHaveLength(1);
  });
}
