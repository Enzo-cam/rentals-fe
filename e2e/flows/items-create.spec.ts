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
import {
  ITEM_IDS,
  LIVING,
  meOf,
  openItemsScreen,
  pageWithoutPrices,
  silla,
  SILLA,
} from "../support/items";
import { N1, signInThroughProxy, USERS } from "../support/session";

const N1_ID = "11111111-1111-4111-8111-111111111111";
const MARTA_ID = "aaaaaaaa-0000-4000-8000-000000000008";
const ANA_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const FORBIDDEN =
  "Tu rol no permite hacer esto. Si lo necesitás, pedíselo al dueño del negocio.";
const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
const OUT_OF_SERVICE_TEXT =
  "No puede haber más unidades fuera de servicio que el stock total.";
const DETAIL_URL = /\/articulos\/[0-9a-f-]{36}$/;
const NUMBER_TEXT = "Escribí un número entero de 0 a 100.000.";

test.beforeEach(async ({ page, request }) => {
  await resetFakeApi(request);
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
});

async function calls(request: APIRequestContext, method: string, path: string) {
  return (await apiRequests(request)).filter(
    (call) => call.method === method && call.path === path,
  );
}

async function fillForm(
  page: Page,
  values: Partial<Record<string, string>> = {},
) {
  const all = {
    Nombre: "Mesa redonda",
    "Stock total": "30",
    "Precio de lista": "12000",
    ...values,
  };
  for (const [label, value] of Object.entries(all)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
}

const save = (page: Page) => page.getByRole("button", { name: "Guardar" });

/** AC-11 */
test("Ana creates an item: exact body, JSON, lands on the detail and the list is asked again", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos");
  await page.getByRole("link", { name: "Nuevo artículo" }).click();
  await page.waitForURL("**/articulos/nuevo");
  await fillForm(page, {
    Nombre: " Mesa redonda 1,50 m ",
    "Stock total": "30",
    "Precio de lista": "$ 12.000",
    Categoría: "Mobiliario",
  });
  await save(page).click();
  await page.waitForURL(DETAIL_URL);
  await expect(page.getByText("$ 12.000")).toBeVisible();

  const sent = await calls(request, "POST", "/items");
  expect(sent).toHaveLength(1);
  expect(sent[0].headers["content-type"]).toContain("application/json");
  expect(sent[0].body).toBe(
    '{"name":"Mesa redonda 1,50 m","totalStock":30,"outOfService":0,"priceCents":1200000,"category":"Mobiliario","code":null,"description":null}',
  );

  const before = (await calls(request, "GET", "/items")).length;
  await page.getByRole("link", { name: "Volver a los artículos" }).click();
  await page.waitForURL("**/articulos");
  await expect(page.getByRole("listitem").first()).toBeVisible();
  await expect
    .poll(async () => (await calls(request, "GET", "/items")).length)
    .toBe(before + 1);
});

test("Ana, who opens /articulos/nuevo by URL, sees the form and stays", async ({
  page,
}) => {
  await openItemsScreen(page, "/articulos/nuevo");
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/articulos\/nuevo$/);
});

/** AC-12 */
test("a form with errors of shape sends nothing and shows each text", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page, {
    Nombre: "",
    "Stock total": "1,5",
    "Precio de lista": "1500,50",
  });
  await save(page).click();
  await expect(page.getByText("Escribí el nombre.")).toBeVisible();
  await expect(page.getByText(NUMBER_TEXT)).toBeVisible();
  await expect(
    page.getByText(
      "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.",
    ),
  ).toBeVisible();
  expect(await calls(request, "POST", "/items")).toHaveLength(0);
});

/** AC-12 */
test("the edges of shape: 100.001 and 100.000.001 fail, 1.500 and 0 pass", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page, {
    "Stock total": "100.001",
    "Precio de lista": "100.000.001",
  });
  await save(page).click();
  await expect(page.getByText(NUMBER_TEXT)).toBeVisible();
  await expect(page.getByText(/^Escribí el precio en pesos/)).toBeVisible();
  expect(await calls(request, "POST", "/items")).toHaveLength(0);

  await fillForm(page, { "Stock total": "1.500", "Precio de lista": "0" });
  await save(page).click();
  await page.waitForURL(DETAIL_URL);
  const sent = await calls(request, "POST", "/items");
  expect(JSON.parse(sent[0].body ?? "{}")).toMatchObject({
    totalStock: 1500,
    priceCents: 0,
  });
});

/** AC-13 */
test("more out of service than stock goes to the API, and its 400 shows under Fuera de servicio", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 400,
    body: { error: "out_of_service_exceeds_stock" },
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page, { "Stock total": "10", "Fuera de servicio": "12" });
  await save(page).click();
  await expect(page.getByText(OUT_OF_SERVICE_TEXT)).toBeVisible();
  await expect(page.getByLabel("Stock total")).toHaveValue("10");
  await expect(page.getByLabel("Fuera de servicio")).toHaveValue("12");
  const sent = await calls(request, "POST", "/items");
  expect(JSON.parse(sent[0].body ?? "{}")).toMatchObject({
    totalStock: 10,
    outOfService: 12,
  });
});

/** AC-14 */
test("a taken name shows the text and a link to the item that has it", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 409,
    body: {
      error: "item_name_taken",
      item: { id: ITEM_IDS.silla, name: SILLA, archived: false },
    },
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page, { Nombre: SILLA });
  await save(page).click();
  await expect(
    page.getByText("Ya tenés un artículo con este nombre."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Ver «${SILLA}»` }),
  ).toHaveAttribute("href", `/articulos/${ITEM_IDS.silla}`);
});

/** AC-14 */
test("a taken code shows its text and the link", async ({ page, request }) => {
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 409,
    body: {
      error: "item_code_taken",
      item: { id: ITEM_IDS.silla, name: SILLA, archived: false },
    },
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page, { Código: "SIL-01" });
  await save(page).click();
  await expect(
    page.getByText(`Este código ya lo usa «${SILLA}».`),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Ver «${SILLA}»` }),
  ).toBeVisible();
});

/** AC-15 */
test("a name held by an archived item says so, with the link", async ({
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
  await fillForm(page, { Nombre: LIVING });
  await save(page).click();
  await expect(
    page.getByText("Ya tenés un artículo con este nombre, dado de baja."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Ver «${LIVING}»` }),
  ).toHaveAttribute("href", `/articulos/${ITEM_IDS.living}`);
});

/** AC-16 */
test("two submits in the same tick send one POST, and the button says Guardando…", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    delayMs: 1500,
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page);
  await page.evaluate(() => {
    const form = document.querySelector("form");
    form?.requestSubmit();
    form?.requestSubmit();
  });
  const busy = page.getByRole("button", { name: "Guardando…" });
  await expect(busy).toBeVisible();
  await expect(busy).toBeDisabled();
  await page.waitForURL(DETAIL_URL);
  expect(await calls(request, "POST", "/items")).toHaveLength(1);
});

/** AC-17 */
test("Marta, whose role changed to crew, is sent back to /articulos after a 403", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.marta.email, USERS.marta.password);
  await openItemsScreen(page, "/articulos");
  await expect(page.getByRole("listitem").first()).toContainText("$ 1.500");
  await page.getByRole("link", { name: "Nuevo artículo" }).click();
  await page.waitForURL(/\/articulos\/nuevo$/);
  await fillForm(page);
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 403,
    body: { error: "forbidden" },
  });
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    status: 200,
    body: pageWithoutPrices([silla], null),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 200,
    body: meOf(
      { id: MARTA_ID, name: "Marta", email: USERS.marta.email },
      { id: N1_ID, name: N1 },
      "crew",
      false,
    ),
  });
  await save(page).click();
  await page.waitForURL(/\/articulos$/);
  expect((await calls(request, "GET", "/me")).length).toBeGreaterThanOrEqual(2);
  await expect(page.getByText(SILLA)).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$");
});

/** AC-17 */
test("Marta, whose role did not change, sees the text of forbidden", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.marta.email, USERS.marta.password);
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page);
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 403,
    body: { error: "forbidden" },
  });
  await save(page).click();
  await expect(page.getByText(FORBIDDEN)).toBeVisible();
  await expect(page).toHaveURL(/\/articulos\/nuevo$/);
  await expect
    .poll(async () => (await calls(request, "GET", "/me")).length)
    .toBeGreaterThanOrEqual(2);
});

/** AC-18 */
test("a 403 read_only turns the business read only and the screen goes back to /articulos with the notice", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page);
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 403,
    body: { error: "read_only" },
  });
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 200,
    body: meOf(
      { id: ANA_ID, name: "Ana", email: USERS.ana.email },
      { id: N1_ID, name: N1 },
      "owner",
      true,
    ),
  });
  await save(page).click();
  await page.waitForURL(/\/articulos$/);
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
  expect(await calls(request, "POST", "/items")).toHaveLength(1);
});

/** AC-19 */
test("a 502 keeps the values, and Guardar sends another POST", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "POST",
    path: "/items",
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page);
  await save(page).click();
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Mesa redonda",
  );
  await save(page).click();
  await page.waitForURL(DETAIL_URL);
  expect(await calls(request, "POST", "/items")).toHaveLength(2);
});

test("when /me does not load the alta shows the failure, and Reintentar asks again and shows the form", async ({
  page,
  request,
}) => {
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/articulos/nuevo");
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  const before = (await calls(request, "GET", "/me")).length;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  expect((await calls(request, "GET", "/me")).length).toBe(before + 1);
});

/** AC-12 */
test("an empty price shows the price text and sends nothing", async ({
  page,
  request,
}) => {
  await openItemsScreen(page, "/articulos/nuevo");
  await fillForm(page, { "Precio de lista": "" });
  await save(page).click();
  await expect(
    page.getByText(
      "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.",
    ),
  ).toBeVisible();
  expect(await calls(request, "POST", "/items")).toHaveLength(0);
});
