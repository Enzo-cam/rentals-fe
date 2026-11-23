import { expect, test, type Page } from "@playwright/test";

import {
  availabilityCalls,
  pageOf as availabilityPageOf,
  sillaRow,
} from "../support/availability";
import { bodyOf, bookingWriteCalls } from "../support/bookings";
import {
  ana,
  ANA,
  BAR,
  CUSTOMER_IDS,
  customerListCalls,
  customerWrites,
  lucia,
  LUCIA,
  pageOf as customersPageOf,
} from "../support/customers";
import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import {
  copa,
  COPA,
  ITEM_IDS,
  openItemsScreen,
  pageOf as itemsPageOf,
  SILLA,
} from "../support/items";
import { expectPrivatePage } from "../support/private-page";
import { signInThroughProxy, USERS } from "../support/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DETAIL_URL = /\/reservas\/[0-9a-f-]{36}$/;
const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
const REUSED = "La reserva ya se había guardado con los datos anteriores.";
const PICKUP_AFTER_DELIVERY = "El retiro tiene que ser después de la entrega.";
const PICKUP_IN_PAST = "El retiro ya pasó: elegí un día que no haya pasado.";
const HOLD_EXPIRY =
  "El bloqueo tiene que vencer después de ahora y no después de la entrega.";
const TRANSPARENT = "rgba(0, 0, 0, 0)";
const PRICE_TEXT =
  "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

const main = (page: Page) => page.getByRole("main");
const save = (page: Page) =>
  main(page).getByRole("button", { name: "Guardar reserva" });
const field = (page: Page, label: string) =>
  main(page).getByLabel(label, { exact: true });
/** The block of a field: its label, its input and what is said about it. */
const around = (page: Page, label: string) =>
  field(page, label).locator("xpath=..");
const line = (page: Page, name: string) =>
  main(page).getByRole("group", { name });

function valueOf(page: Page, label: string) {
  return page
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("xpath=following-sibling::dd");
}

async function openForm(page: Page, user = USERS.ana) {
  await signInThroughProxy(page, user.email, user.password);
  await openItemsScreen(page, "/reservas/nueva");
  await expect(
    main(page).getByRole("button", { name: "Elegir cliente" }),
  ).toBeVisible();
}

/** One of the first page of the sheet, in the order of the API. */
async function chooseCustomer(page: Page, name: string) {
  await main(page).getByRole("button", { name: "Elegir cliente" }).click();
  const sheet = page.getByRole("dialog", { name: "Elegir cliente" });
  await sheet.getByRole("button", { name: new RegExp(name) }).click();
  await expect(sheet).toHaveCount(0);
  await expect(main(page).getByText(name, { exact: true })).toBeVisible();
}

async function addItem(page: Page, name: string) {
  await main(page).getByRole("button", { name: "Agregar artículo" }).click();
  const sheet = page.getByRole("dialog", { name: "Agregar artículo" });
  await sheet.getByRole("button", { name: new RegExp(name) }).click();
  await expect(sheet).toHaveCount(0);
  await expect(line(page, name)).toBeVisible();
}

async function fillPeriod(page: Page) {
  await field(page, "Entrega").fill("2030-03-15T08:00");
  await field(page, "Retiro").fill("2030-03-16T19:00");
}

/** A hold for `customer` with the Silla, ready to save; `quantity` is what the line asks. */
async function fillMinimal(page: Page, quantity = "2", customer = ANA) {
  await chooseCustomer(page, customer);
  await addItem(page, SILLA);
  await line(page, SILLA).getByLabel("Cantidad").fill(quantity);
  await field(page, "Vence el bloqueo").fill("2030-03-12T12:00");
  await fillPeriod(page);
}

/** AC-1, AC-3, AC-4 */
test("a hold with two lines, a typed total and a deposit by shortcut is saved with one POST, and the form is replaced by the detail", async ({
  page,
  request,
}) => {
  await openForm(page);
  await expect(
    main(page).getByRole("heading", { name: "Nueva reserva" }),
  ).toBeVisible();
  await expectPrivatePage(page);
  await expect(field(page, "Estado")).toHaveValue("hold");

  await main(page).getByRole("button", { name: "Elegir cliente" }).click();
  const sheet = page.getByRole("dialog", { name: "Elegir cliente" });
  await expect(sheet.getByRole("button", { name: /Ana Gómez/ })).toBeVisible();
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    query: { q: "Luc" },
    status: 200,
    body: customersPageOf([lucia], null),
  });
  await sheet.getByLabel("Nombre o WhatsApp").fill("Luc");
  await sheet.getByRole("button", { name: "Buscar" }).click();
  await expect(sheet.getByRole("button", { name: /Ana Gómez/ })).toHaveCount(0);
  await sheet.getByRole("button", { name: new RegExp(LUCIA) }).click();
  await expect(sheet).toHaveCount(0);
  await expect(main(page).getByText(LUCIA, { exact: true })).toBeVisible();
  expect((await customerListCalls(request)).map((call) => call.query)).toEqual([
    "",
    "?q=Luc",
  ]);

  await addItem(page, SILLA);
  await expect(line(page, SILLA).getByLabel("Cantidad")).toHaveValue("1");
  await expect(line(page, SILLA).getByLabel("Precio")).toHaveValue("1.500");
  await addItem(page, COPA);
  await expect(line(page, COPA).getByLabel("Precio")).toHaveValue("350");
  expect(await availabilityCalls(request)).toEqual([]);

  await field(page, "Vence el bloqueo").fill("2030-03-12T12:00");
  await field(page, "Entrega").fill("2030-03-15T08:00");
  expect(await availabilityCalls(request)).toEqual([]);
  await field(page, "Retiro").fill("2030-03-16T19:00");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).toBeVisible();
  await expect(line(page, COPA).getByText("Hay 1.080 libres")).toBeVisible();
  const asked = await availabilityCalls(request);
  const last = asked[asked.length - 1];
  expect(last.get("from")).toBe("2030-03-15T08:00:00-03:00");
  expect(last.get("to")).toBe("2030-03-16T19:00:00-03:00");
  expect(last.get("ids")).toBe(`${ITEM_IDS.silla},${ITEM_IDS.copa}`);
  expect(last.get("limit")).toBe("100");

  await field(page, "Fecha del evento").fill("2030-03-15");
  await field(page, "Motivo").fill("Casamiento");
  await line(page, SILLA).getByLabel("Cantidad").fill("80");
  await line(page, SILLA).getByLabel("Precio").fill("5000");
  await line(page, COPA).getByLabel("Cantidad").fill("200");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).not.toHaveClass(
    /text-destructive/,
  );
  await field(page, "Flete").fill("30000");
  await expect(field(page, "Total")).toHaveValue("500.000");
  await expect(
    main(page).getByText("Suma de líneas y flete: $ 500.000"),
  ).toBeVisible();
  await field(page, "Total").fill("450.000");
  await main(page).getByRole("button", { name: "20 %" }).click();
  await expect(field(page, "Seña")).toHaveValue("90.000");
  await field(page, "Fecha de la seña").fill("2030-03-01");
  await field(page, "Dirección").fill("Av. Costanera 1200");
  await field(page, "Nota").fill("Llevar mantel");

  expect(await bookingWriteCalls(request)).toEqual([]);
  expect(await customerWrites(request)).toEqual([]);
  await save(page).click();
  await page.waitForURL(DETAIL_URL);

  const writes = await bookingWriteCalls(request);
  expect(writes).toHaveLength(1);
  expect(writes[0].method).toBe("POST");
  expect(writes[0].headers["idempotency-key"]).toMatch(UUID);
  expect(bodyOf(writes[0])).toEqual({
    status: "hold",
    customerId: CUSTOMER_IDS.lucia,
    deliveryAt: "2030-03-15T08:00:00-03:00",
    pickupAt: "2030-03-16T19:00:00-03:00",
    holdExpiresAt: "2030-03-12T12:00:00-03:00",
    address: "Av. Costanera 1200",
    note: "Llevar mantel",
    eventDate: "2030-03-15",
    occasion: "Casamiento",
    freightCents: 3000000,
    totalCents: 45000000,
    deposit: { amountCents: 9000000, date: "2030-03-01" },
    lines: [
      { itemId: ITEM_IDS.silla, quantity: 80, priceCents: 500000 },
      { itemId: ITEM_IDS.copa, quantity: 200, priceCents: 35000 },
    ],
  });

  await expect(main(page).getByRole("heading", { name: LUCIA })).toBeVisible();
  await expect(valueOf(page, "Entrega")).toHaveText("vie 15 mar 2030, 08:00");
  await expect(valueOf(page, "Retiro")).toHaveText("sáb 16 mar 2030, 19:00");
  await expect(valueOf(page, "Vence el bloqueo")).toHaveText(
    "mar 12 mar 2030, 12:00",
  );
  await expect(valueOf(page, "Dirección")).toHaveText("Av. Costanera 1200");
  await expect(valueOf(page, "Nota")).toHaveText("Llevar mantel");
  await expect(main(page).getByText("Silla Tiffany blanca × 80")).toBeVisible();
  await expect(main(page).getByText("$ 5.000 c/u")).toBeVisible();
  await expect(main(page).getByText("Copa de vino × 200")).toBeVisible();
  await expect(valueOf(page, "Flete")).toHaveText("$ 30.000");
  await expect(valueOf(page, "Seña")).toHaveText("$ 90.000 el vie 1 mar 2030");
  await expect(
    main(page).getByText("$ 360.000", { exact: true }),
  ).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL("/");
});

/** AC-2 */
test("a confirmed booking with the total untouched sends the suggested sum, no deposit and no expiry", async ({
  page,
  request,
}) => {
  await openForm(page);
  await chooseCustomer(page, ANA);
  await addItem(page, SILLA);
  await line(page, SILLA).getByLabel("Cantidad").fill("2");
  await field(page, "Vence el bloqueo").fill("2030-03-12T12:00");
  await field(page, "Estado").selectOption("confirmed");
  await expect(field(page, "Vence el bloqueo")).toHaveCount(0);
  await fillPeriod(page);
  await expect(field(page, "Total")).toHaveValue("3.000");
  await expect(
    main(page).getByText("Suma de líneas y flete: $ 3.000"),
  ).toBeVisible();

  await save(page).click();
  await page.waitForURL(DETAIL_URL);
  const writes = await bookingWriteCalls(request);
  expect(writes).toHaveLength(1);
  expect(bodyOf(writes[0])).toEqual({
    status: "confirmed",
    customerId: CUSTOMER_IDS.ana,
    deliveryAt: "2030-03-15T08:00:00-03:00",
    pickupAt: "2030-03-16T19:00:00-03:00",
    freightCents: 0,
    totalCents: 300000,
    lines: [{ itemId: ITEM_IDS.silla, quantity: 2, priceCents: 150000 }],
  });
  await expect(
    main(page).getByText("Confirmada", { exact: true }),
  ).toBeVisible();
  await expect(valueOf(page, "Vence el bloqueo")).toHaveCount(0);
});

/** AC-3, AC-1 */
test("with a form that is ready, searching and creating a customer in the sheets leaves the new one chosen and saves nothing", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page);
  expect(await bookingWriteCalls(request)).toEqual([]);

  await main(page).getByRole("button", { name: "Cambiar cliente" }).click();
  const picker = page.getByRole("dialog", { name: "Elegir cliente" });
  await overrideNext(request, {
    method: "GET",
    path: "/customers",
    query: { q: "Pe" },
    status: 200,
    body: customersPageOf([], null),
  });
  await picker.getByLabel("Nombre o WhatsApp").fill("Pe");
  await picker.getByRole("button", { name: "Buscar" }).click();
  await expect(
    picker.getByText("No hay clientes con esa búsqueda."),
  ).toBeVisible();
  await picker.getByRole("button", { name: "Nuevo cliente" }).click();
  const sheet = page.getByRole("dialog", { name: "Nuevo cliente" });
  await sheet.getByLabel("Nombre", { exact: true }).fill("Pedro Paz");
  await sheet.getByLabel("WhatsApp", { exact: true }).fill("3794 000111");
  await sheet.getByRole("button", { name: "Guardar" }).click();

  await expect(sheet).toHaveCount(0);
  await expect(
    main(page).getByText("Pedro Paz", { exact: true }),
  ).toBeVisible();
  await expect(main(page).getByText(ANA, { exact: true })).toHaveCount(0);
  const writes = await customerWrites(request);
  expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
    "POST /customers",
  ]);
  expect(bodyOf(writes[0])).toEqual({
    name: "Pedro Paz",
    whatsapp: "3794 000111",
  });

  await main(page).getByRole("button", { name: "Agregar artículo" }).click();
  const items = page.getByRole("dialog", { name: "Agregar artículo" });
  await expect(items.getByRole("button", { name: SILLA })).toBeDisabled();
  await overrideNext(request, {
    method: "GET",
    path: "/items",
    query: { q: "Co" },
    status: 200,
    body: itemsPageOf([copa], null),
  });
  await items.getByLabel("Nombre del artículo").fill("Co");
  await items.getByRole("button", { name: "Buscar" }).click();
  await expect(items.getByRole("button", { name: SILLA })).toHaveCount(0);
  await items.getByRole("button", { name: new RegExp(COPA) }).click();
  await expect(line(page, COPA)).toBeVisible();
  const listed = (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/items",
  );
  expect(listed.map((call) => call.query)).toEqual([
    "?status=active",
    "?status=active",
    "?status=active&q=Co",
  ]);

  expect(await bookingWriteCalls(request)).toEqual([]);
  await expect(page).toHaveURL(/\/reservas\/nueva$/);
});

/** AC-3 */
test("a WhatsApp that already has a customer switches the sheet to editing that customer, and saving leaves it chosen", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page, "2", BAR);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 409,
    body: { error: "whatsapp_taken", customer: ana },
  });
  await main(page).getByRole("button", { name: "Cambiar cliente" }).click();
  await page
    .getByRole("dialog", { name: "Elegir cliente" })
    .getByRole("button", { name: "Nuevo cliente" })
    .click();
  const sheet = page.getByRole("dialog", { name: "Nuevo cliente" });
  await sheet.getByLabel("Nombre", { exact: true }).fill("Rosa Díaz");
  await sheet.getByLabel("WhatsApp", { exact: true }).fill(ana.whatsapp);
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await sheet.getByRole("button", { name: `Editar a ${ANA}` }).click();

  const edit = page.getByRole("dialog", { name: "Editar cliente" });
  await edit.getByLabel("Nombre", { exact: true }).fill("Ana Gómez de Paz");
  await edit.getByRole("button", { name: "Guardar" }).click();
  await expect(edit).toHaveCount(0);
  await expect(
    main(page).getByText("Ana Gómez de Paz", { exact: true }),
  ).toBeVisible();
  await expect(main(page).getByText(BAR, { exact: true })).toHaveCount(0);
  const writes = await customerWrites(request);
  expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
    "POST /customers",
    `PATCH /customers/${CUSTOMER_IDS.ana}`,
  ]);
  expect(await bookingWriteCalls(request)).toEqual([]);
  await expect(page).toHaveURL(/\/reservas\/nueva$/);
});

/** AC-3 */
test("a WhatsApp that already has a customer: saving that customer with no changes chooses it, sends no PATCH and closes the sheet", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page, "2", BAR);
  await overrideNext(request, {
    method: "POST",
    path: "/customers",
    status: 409,
    body: { error: "whatsapp_taken", customer: ana },
  });
  await main(page).getByRole("button", { name: "Cambiar cliente" }).click();
  await page
    .getByRole("dialog", { name: "Elegir cliente" })
    .getByRole("button", { name: "Nuevo cliente" })
    .click();
  const sheet = page.getByRole("dialog", { name: "Nuevo cliente" });
  await sheet.getByLabel("Nombre", { exact: true }).fill("Rosa Díaz");
  await sheet.getByLabel("WhatsApp", { exact: true }).fill(ana.whatsapp);
  await sheet.getByRole("button", { name: "Guardar" }).click();
  await sheet.getByRole("button", { name: `Editar a ${ANA}` }).click();

  const edit = page.getByRole("dialog", { name: "Editar cliente" });
  await expect(edit.getByLabel("Nombre", { exact: true })).toHaveValue(ANA);
  await edit.getByRole("button", { name: "Guardar" }).click();
  await expect(edit).toHaveCount(0);
  await expect(main(page).getByText(ANA, { exact: true })).toBeVisible();
  await expect(main(page).getByText(BAR, { exact: true })).toHaveCount(0);
  await expect(
    main(page).getByRole("button", { name: "Cambiar cliente" }),
  ).toBeVisible();
  const writes = await customerWrites(request);
  expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
    "POST /customers",
  ]);
  expect(await bookingWriteCalls(request)).toEqual([]);
  await expect(page).toHaveURL(/\/reservas\/nueva$/);
});

/** AC-5 */
test("a form with the wrong shape says what is wrong under each field and sends nothing", async ({
  page,
  request,
}) => {
  await openForm(page);
  await save(page).click();
  await expect(main(page).getByText("Elegí el cliente.")).toBeVisible();
  await expect(
    around(page, "Vence el bloqueo").getByText(
      "Elegí cuándo vence el bloqueo.",
    ),
  ).toBeVisible();
  await expect(
    around(page, "Entrega").getByText("Elegí el día y la hora de entrega."),
  ).toBeVisible();
  await expect(
    around(page, "Retiro").getByText("Elegí el día y la hora de retiro."),
  ).toBeVisible();
  await expect(
    main(page).getByText("Agregá al menos un artículo."),
  ).toBeVisible();
  expect(await bookingWriteCalls(request)).toEqual([]);

  await chooseCustomer(page, ANA);
  await addItem(page, SILLA);
  await expect(main(page).getByText("Elegí el cliente.")).toHaveCount(0);
  await expect(
    main(page).getByText("Agregá al menos un artículo."),
  ).toHaveCount(0);
  await line(page, SILLA).getByLabel("Precio").fill("1,5");
  await line(page, SILLA).getByLabel("Cantidad").fill("0");
  await field(page, "Seña").fill("90000");
  await field(page, "Total").fill("");
  await save(page).click();
  await expect(line(page, SILLA).getByText(PRICE_TEXT)).toBeVisible();
  await expect(
    line(page, SILLA).getByText("Escribí una cantidad de 1 a 100.000."),
  ).toBeVisible();
  await expect(
    around(page, "Fecha de la seña").getByText("Elegí el día de la seña."),
  ).toBeVisible();
  await expect(
    around(page, "Total").getByText(
      "Escribí el total en pesos, sin centavos: 450000, 450.000 o $ 450.000.",
    ),
  ).toBeVisible();
  expect(await bookingWriteCalls(request)).toEqual([]);
});

/** AC-4 */
test("with no units free the help says so, and with fewer than asked it turns red and Guardar stays enabled", async ({
  page,
  request,
}) => {
  await openForm(page);
  await chooseCustomer(page, ANA);
  await addItem(page, SILLA);
  await overrideNext(request, {
    method: "GET",
    path: "/availability",
    status: 200,
    body: availabilityPageOf([{ ...sillaRow, available: 0 }], null),
  });
  await fillPeriod(page);
  await expect(line(page, SILLA).getByText("No hay libres")).toBeVisible();
  await expect(line(page, SILLA).getByText("No hay libres")).toHaveClass(
    /text-destructive/,
  );
  await expect(save(page)).toBeEnabled();

  await field(page, "Retiro").fill("2030-03-17T19:00");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).toBeVisible();
  await line(page, SILLA).getByLabel("Cantidad").fill("87");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).toHaveClass(
    /text-destructive/,
  );
  await expect(save(page)).toBeEnabled();
  await line(page, SILLA).getByLabel("Cantidad").fill("86");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).not.toHaveClass(
    /text-destructive/,
  );
});

/** AC-6, AC-4 */
test("a 409 insufficient_stock says what is free under the line, and lowering it saves with the same key", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page, "100");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).toHaveClass(
    /text-destructive/,
  );
  await expect(save(page)).toBeEnabled();
  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 409,
    body: {
      error: "insufficient_stock",
      items: [{ itemId: ITEM_IDS.silla, requested: 100, available: 86 }],
    },
  });
  await save(page).click();
  await expect(
    line(page, SILLA).getByText("Pediste 100 y hay 86 libres."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/reservas\/nueva$/);
  await expect(line(page, SILLA).getByLabel("Cantidad")).toHaveValue("100");

  await line(page, SILLA).getByLabel("Cantidad").fill("80");
  await save(page).click();
  await page.waitForURL(DETAIL_URL);
  const writes = await bookingWriteCalls(request);
  expect(writes).toHaveLength(2);
  expect(writes[0].headers["idempotency-key"]).toMatch(UUID);
  expect(writes[1].headers["idempotency-key"]).toBe(
    writes[0].headers["idempotency-key"],
  );
  expect(bodyOf(writes[0])).toMatchObject({
    lines: [{ itemId: ITEM_IDS.silla, quantity: 100 }],
  });
  expect(bodyOf(writes[1])).toMatchObject({
    lines: [{ itemId: ITEM_IDS.silla, quantity: 80 }],
  });
});

/** AC-7 */
test("a 409 item_archived says the item was taken down under its line", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page);
  await addItem(page, COPA);
  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 409,
    body: { error: "item_archived", itemIds: [ITEM_IDS.copa] },
  });
  await save(page).click();
  await expect(line(page, COPA).getByText("Dado de baja.")).toBeVisible();
  await expect(line(page, SILLA).getByText("Dado de baja.")).toHaveCount(0);
  await expect(page).toHaveURL(/\/reservas\/nueva$/);
});

/** AC-8 */
test("the period and the hold expiry that the API refuses are said under the field they are about", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page);
  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 400,
    body: { error: "invalid_period" },
  });
  await save(page).click();
  await expect(
    around(page, "Retiro").getByText(PICKUP_AFTER_DELIVERY),
  ).toBeVisible();

  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 400,
    body: { error: "pickup_in_past" },
  });
  await save(page).click();
  await expect(around(page, "Retiro").getByText(PICKUP_IN_PAST)).toBeVisible();
  await expect(
    around(page, "Retiro").getByText(PICKUP_AFTER_DELIVERY),
  ).toHaveCount(0);

  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 400,
    body: { error: "invalid_hold_expiry" },
  });
  await save(page).click();
  await expect(
    around(page, "Vence el bloqueo").getByText(HOLD_EXPIRY),
  ).toBeVisible();
  await expect(around(page, "Retiro").getByText(PICKUP_IN_PAST)).toHaveCount(0);
  expect(await bookingWriteCalls(request)).toHaveLength(3);
});

/** AC-9 */
test("a 422 idempotency_key_reused says the booking was already saved and offers the list of reservations, with the border of an outline button", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page);
  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 422,
    body: { error: "idempotency_key_reused" },
  });
  await save(page).click();
  await expect(main(page).getByText(REUSED)).toBeVisible();
  const seeBookings = main(page).getByRole("link", {
    name: "Ver las reservas",
  });
  await expect(seeBookings).toHaveAttribute("href", "/reservas");
  await expect(seeBookings).not.toHaveCSS("border-top-color", TRANSPARENT);
});

/** AC-10 */
test("a 502 and a cut connection keep the form, and every retry carries the same key until it saves once", async ({
  page,
  request,
}) => {
  await openForm(page);
  await fillMinimal(page);
  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    status: 502,
  });
  await save(page).click();
  await expect(main(page).getByText(UNAVAILABLE)).toBeVisible();
  await expect(page).toHaveURL(/\/reservas\/nueva$/);
  await expect(save(page)).toBeEnabled();

  await overrideNext(request, {
    method: "POST",
    path: "/bookings",
    mode: "reset",
  });
  await save(page).click();
  await expect(main(page).getByText(UNAVAILABLE)).toBeVisible();

  await save(page).click();
  await page.waitForURL(DETAIL_URL);
  const writes = await bookingWriteCalls(request);
  expect(writes).toHaveLength(3);
  const keys = writes.map((call) => call.headers["idempotency-key"]);
  expect(keys[0]).toMatch(UUID);
  expect(new Set(keys).size).toBe(1);
  expect(new Set(writes.map((call) => call.body)).size).toBe(1);
});

/** AC-11 */
for (const [name, user] of [
  ["Beto, who is crew", USERS.beto],
  ["Olga, whose business is read only", USERS.olga],
] as const) {
  test(`${name}, is taken back to the list without asking for customers or items`, async ({
    page,
    request,
  }) => {
    await signInThroughProxy(page, user.email, user.password);
    await openItemsScreen(page, "/reservas/nueva");
    await expect(page).toHaveURL(/\/reservas$/);
    await expect(
      main(page).getByRole("heading", { name: "Reservas" }),
    ).toBeVisible();
    const paths = (await apiRequests(request)).map((call) => call.path);
    expect(paths).not.toContain("/customers");
    expect(paths).not.toContain("/items");
  });
}

/** AC-11 */
test("Marta, who is manager, opens the form", async ({ page }) => {
  await openForm(page, USERS.marta);
  await expect(save(page)).toBeVisible();
});
