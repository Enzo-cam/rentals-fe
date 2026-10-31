import { expect, test, type Page } from "@playwright/test";

import {
  ana,
  ANA,
  ASOCIACION,
  bar,
  BAR,
  CUSTOMER_IDS,
  customerListCalls,
  customerWrites,
  lucia,
  LUCIA,
  MARCOS,
  pageOf,
} from "../support/customers";
import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import { meOf, openItemsScreen } from "../support/items";
import { expectPrivatePage } from "../support/private-page";
import { signInThroughProxy, USERS } from "../support/session";

const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
const INVALID_WHATSAPP =
  "Tiene que tener 10 dígitos: característica y número, sin el 15.";
const ANA_USER = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  name: "Ana",
  email: USERS.ana.email,
};
const N1 = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Negocio de Ana",
};

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

const rows = (page: Page) => page.getByRole("main").getByRole("listitem");
const sections = (page: Page) =>
  page.getByRole("navigation", { name: "Secciones" });

async function signInAsAna(page: Page) {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
}

async function fillNewCustomer(page: Page, name: string, whatsapp: string) {
  const sheet = page.getByRole("dialog", { name: "Nuevo cliente" });
  await sheet.getByLabel("Nombre", { exact: true }).fill(name);
  await sheet.getByLabel("WhatsApp", { exact: true }).fill(whatsapp);
  return sheet;
}

async function openNewCustomer(page: Page) {
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await expect(
    page.getByRole("dialog", { name: "Nuevo cliente" }),
  ).toBeVisible();
}

/** AC-7 */
test("the list shows name and WhatsApp in the order of the API, and Ver más asks for the next cursor", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/clientes");
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(0)).toContainText(ANA);
  await expect(rows(page).nth(0)).toContainText("3794 123456");
  await expect(rows(page).nth(1)).toContainText(ASOCIACION);
  await expect(rows(page).nth(2)).toContainText(BAR);
  await expect(rows(page).nth(2)).toContainText("3624 987654");

  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).nth(3)).toContainText(LUCIA);
  await expect(rows(page).nth(4)).toContainText(MARCOS);
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);

  const calls = await customerListCalls(request);
  expect(calls.map((call) => call.query)).toEqual(["", "?cursor=c-3"]);
});

/** AC-7 */
test("a customer that the next page repeats shows once", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    status: 200,
    body: pageOf([ana, bar], "c-2"),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    query: { cursor: "c-2" },
    status: 200,
    body: pageOf([bar, lucia], null),
  });
  await openItemsScreen(page, "/clientes");
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText(BAR)).toHaveCount(1);
});

/** AC-7 */
test("an empty list says so and offers no Ver más", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    status: 200,
    body: pageOf([], null),
  });
  await openItemsScreen(page, "/clientes");
  await expect(page.getByText("Todavía no cargaste clientes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);
});

/** AC-7 */
test("a 502 shows the error and Reintentar asks again", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/clientes");
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);
});

/** AC-8 */
test("searching puts q in the URL and in the request, and a reload keeps the field and the list", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    query: { q: "ana" },
    times: 2,
    status: 200,
    body: pageOf([ana], null),
  });
  await openItemsScreen(page, "/clientes");
  await page.getByLabel("Nombre o WhatsApp").fill("ana");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.waitForURL("**/clientes?q=ana");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(ANA);

  await page.reload();
  await expect(page.getByLabel("Nombre o WhatsApp")).toHaveValue("ana");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(ANA);

  const calls = await customerListCalls(request);
  expect(calls.map((call) => call.query)).toEqual(["", "?q=ana", "?q=ana"]);
});

/** AC-8 */
test("Ver más in a search asks for the next page with the same q and the cursor", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    query: { q: "ana", cursor: "c-1" },
    status: 200,
    body: pageOf([lucia], null),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    query: { q: "ana" },
    status: 200,
    body: pageOf([ana], "c-1"),
  });
  await openItemsScreen(page, "/clientes?q=ana");
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(1)).toContainText(LUCIA);
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);

  const calls = await customerListCalls(request);
  const last = new URLSearchParams(calls[calls.length - 1].query);
  expect(last.get("q")).toBe("ana");
  expect(last.get("cursor")).toBe("c-1");
});

/** AC-8 */
test("a q over 100 characters or made of spaces never reaches the API", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/clientes?q=${"x".repeat(101)}`);
  await expect(rows(page)).toHaveCount(3);
  await openItemsScreen(page, "/clientes?q=%20%20%20");
  await expect(rows(page)).toHaveCount(3);

  await page.getByLabel("Nombre o WhatsApp").fill("y".repeat(101));
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.waitForURL(/\/clientes$/);
  await expect(rows(page)).toHaveCount(3);

  const calls = await customerListCalls(request);
  expect(calls.length).toBeGreaterThanOrEqual(2);
  expect(calls.every((call) => call.query === "")).toBe(true);
});

/** AC-9 */
test("Nuevo cliente opens the sheet, empty fields send nothing, and a valid save sends one POST and shows the customer", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/clientes");
  await openNewCustomer(page);
  const sheet = page.getByRole("dialog", { name: "Nuevo cliente" });
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet.getByText("Escribí el nombre.")).toBeVisible();
  await expect(sheet.getByText("Escribí el WhatsApp.")).toBeVisible();
  expect(await customerWrites(request)).toEqual([]);

  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    delayMs: 300,
  });
  await fillNewCustomer(page, "  Alberto Sosa ", " 3794 654321 ");
  await sheet.getByRole("button", { name: "Guardar" }).dblclick();
  await expect(sheet).toHaveCount(0);
  await expect(rows(page).first()).toContainText("Alberto Sosa");
  await expect(rows(page).first()).toContainText("3794 654321");

  const writes = await customerWrites(request);
  expect(writes).toHaveLength(1);
  expect(writes[0].method).toBe("POST");
  expect(writes[0].path).toBe("/customers");
  expect(writes[0].headers["content-type"]).toContain("application/json");
  expect(writes[0].headers["idempotency-key"]).toBeUndefined();
  expect(writes[0].body).toBe(
    '{"name":"Alberto Sosa","whatsapp":"3794 654321"}',
  );
});

/** AC-10 */
test("tapping a row opens the sheet with its values, and saving sends only what changed", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/clientes");
  await page.getByRole("button", { name: new RegExp(`^${ANA}`) }).click();
  const sheet = page.getByRole("dialog", { name: "Editar cliente" });
  await expect(sheet.getByLabel("Nombre", { exact: true })).toHaveValue(ANA);
  await expect(sheet.getByLabel("WhatsApp", { exact: true })).toHaveValue(
    "3794 123456",
  );
  await sheet.getByLabel("WhatsApp", { exact: true }).fill("3794 999888");
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(rows(page).first()).toContainText("3794 999888");

  const writes = await customerWrites(request);
  expect(writes).toHaveLength(1);
  expect(writes[0].method).toBe("PATCH");
  expect(writes[0].path).toBe(`/customers/${CUSTOMER_IDS.ana}`);
  expect(writes[0].body).toBe('{"whatsapp":"3794 999888"}');
});

/** AC-10 */
test("saving with no changes, or with a space at the end of the name, sends nothing and says so", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/clientes");
  await page.getByRole("button", { name: new RegExp(`^${ANA}`) }).click();
  const sheet = page.getByRole("dialog", { name: "Editar cliente" });
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet.getByText("No cambiaste nada.")).toBeVisible();

  await sheet.getByLabel("Nombre", { exact: true }).fill(`${ANA} `);
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet.getByText("No cambiaste nada.")).toBeVisible();
  expect(await customerWrites(request)).toEqual([]);
});

/** AC-11 */
test("a 409 whatsapp_taken names the customer and Editar a switches the sheet to that customer", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 409,
    body: { error: "whatsapp_taken", customer: ana },
  });
  await openItemsScreen(page, "/clientes");
  await openNewCustomer(page);
  const sheet = await fillNewCustomer(page, "Rosa Díaz", ana.whatsapp);
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet.getByText(`Ese WhatsApp ya es de ${ANA}.`)).toBeVisible();
  await expect(sheet.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Rosa Díaz",
  );

  await sheet.getByRole("button", { name: `Editar a ${ANA}` }).click();
  const edit = page.getByRole("dialog", { name: "Editar cliente" });
  await expect(edit.getByLabel("Nombre", { exact: true })).toHaveValue(ANA);
  await expect(edit.getByLabel("WhatsApp", { exact: true })).toHaveValue(
    ana.whatsapp,
  );
  await expect(edit.getByText("Ese WhatsApp ya es de")).toHaveCount(0);

  await edit.getByLabel("Nombre", { exact: true }).fill("Ana Gómez de Paz");
  await edit.getByRole("button", { name: "Guardar" }).click();
  await expect(edit).toHaveCount(0);
  const writes = await customerWrites(request);
  expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
    "POST /customers",
    `PATCH /customers/${CUSTOMER_IDS.ana}`,
  ]);
  expect(writes[1].body).toBe('{"name":"Ana Gómez de Paz"}');
});

/** AC-11 */
test("a 400 invalid_whatsapp shows under the WhatsApp field and keeps the values", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 400,
    body: { error: "invalid_whatsapp" },
  });
  await openItemsScreen(page, "/clientes");
  await openNewCustomer(page);
  const sheet = await fillNewCustomer(page, "Rosa Díaz", "123");
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet.getByText(INVALID_WHATSAPP)).toBeVisible();
  await expect(sheet.getByLabel("WhatsApp", { exact: true })).toHaveValue(
    "123",
  );
  await expect(sheet.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Rosa Díaz",
  );
  await expect(sheet.getByRole("button", { name: "Guardar" })).toBeEnabled();
});

/** AC-11 */
test("any other error shows its text above Guardar and keeps the values", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/clientes");
  await openNewCustomer(page);
  const sheet = await fillNewCustomer(page, "Rosa Díaz", "3794 654321");
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await expect(sheet.getByRole("alert").getByText(UNAVAILABLE)).toBeVisible();
  await expect(sheet.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Rosa Díaz",
  );
});

/** AC-11 */
test("a 403 read_only on save asks GET /me again and the screen turns read only", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 403,
    body: { error: "read_only" },
  });
  await openItemsScreen(page, "/clientes");
  await openNewCustomer(page);
  await fillNewCustomer(page, "Rosa Díaz", "3794 654321");
  const meBefore = (await apiRequests(request)).filter(
    (call) => call.path === "/me",
  ).length;
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 200,
    body: meOf(ANA_USER, N1, "owner", true),
  });
  await page
    .getByRole("dialog", { name: "Nuevo cliente" })
    .getByRole("button", { name: "Guardar" })
    .click();
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nuevo cliente" })).toHaveCount(
    0,
  );
  const meAfter = (await apiRequests(request)).filter(
    (call) => call.path === "/me",
  ).length;
  expect(meAfter).toBeGreaterThan(meBefore);
});

/** AC-11, AC-13 */
test("a 403 forbidden on save asks GET /me again and a user who is now crew ends on /articulos", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 403,
    body: { error: "forbidden" },
  });
  await openItemsScreen(page, "/clientes");
  await openNewCustomer(page);
  await fillNewCustomer(page, "Rosa Díaz", "3794 654321");
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 200,
    body: meOf(ANA_USER, N1, "crew", false),
  });
  await page
    .getByRole("dialog", { name: "Nuevo cliente" })
    .getByRole("button", { name: "Guardar" })
    .click();
  await page.waitForURL("**/articulos");
});

/** AC-12 */
test("Olga, whose business is read only, sees the notice and the customers, and nothing opens a sheet", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await openItemsScreen(page, "/clientes");
  await expect(page.getByText("Tu negocio está en solo lectura")).toBeVisible();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Salón Ernesto");
  await expect(rows(page).first()).toContainText("3624 333444");
  await expect(page.getByRole("button", { name: "Nuevo cliente" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: /Salón Ernesto/ })).toHaveCount(
    0,
  );
  await rows(page).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

/** AC-13 */
test("Beto, who is crew, is sent from /clientes to /articulos and no customer is asked for", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await page.goto("/clientes");
  await page.waitForURL("**/articulos");
  await expect(
    sections(page).getByRole("link", { name: "Cuenta" }),
  ).toBeVisible();
  await expect(
    sections(page).getByRole("link", { name: "Clientes" }),
  ).toHaveCount(0);
  expect(await customerListCalls(request)).toEqual([]);
});

/** AC-13 */
test("Marta, who is manager, sees the customers and Nuevo cliente like the owner, with Clientes as the current section", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.marta.email, USERS.marta.password);
  await openItemsScreen(page, "/clientes");
  await expect(rows(page)).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Nuevo cliente" }),
  ).toBeVisible();
  await expect(
    sections(page).getByRole("link", { name: "Clientes" }),
  ).toHaveAttribute("aria-current", "page");
});

/** AC-13 */
test("/clientes is Spanish, not indexable and fits in 360 px, with the longest name and with the sheet open", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/clientes");
  await expect(rows(page).nth(1)).toContainText(ASOCIACION);
  await expect(
    sections(page).getByRole("link", { name: "Clientes" }),
  ).toHaveAttribute("aria-current", "page");
  await expectPrivatePage(page);

  await page
    .getByRole("button", { name: new RegExp(`^${ASOCIACION}`) })
    .click();
  const sheet = page.getByRole("dialog", { name: "Editar cliente" });
  await expect(sheet.getByLabel("Nombre", { exact: true })).toHaveValue(
    ASOCIACION,
  );
  await expectPrivatePage(page);
  const box = await sheet.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
});
