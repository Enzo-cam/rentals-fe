import { expect, test, type Page } from "@playwright/test";

import {
  availabilityCalls,
  pageOf as availabilityPageOf,
  sillaRow,
} from "../support/availability";
import { BOOKING_IDS, bodyOf, bookingWriteCalls } from "../support/bookings";
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
  await expect(valueOf(page, "Total")).toHaveText("$ 450.000");
  await expect(valueOf(page, "Evento")).toHaveText(
    "vie 15 mar 2030 · Casamiento",
  );
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

const NOT_CHANGED = "No cambiaste nada.";
const PRICE_FIXED = "El precio quedó fijo al confirmar.";
const PRICE_LOCKED =
  "El precio de las líneas que ya estaban quedó fijo al confirmar la reserva. Dejalo como estaba.";
const NOT_EDITABLE =
  "Esta reserva cambió mientras tanto y ya no admite este cambio. Mirá cómo quedó.";
const DEPOSIT_SET =
  "La seña ya estaba cargada y no se puede cambiar. Mirá cómo quedó la reserva.";

const status = (page: Page) => main(page).locator("[data-slot=badge]");
const editLink = (page: Page) =>
  main(page).getByRole("link", { name: "Editar", exact: true });

async function openEdit(page: Page, id: string, user = USERS.ana) {
  await signInThroughProxy(page, user.email, user.password);
  await openItemsScreen(page, `/reservas/${id}/editar`);
  await expect(save(page)).toBeVisible();
}

/** The `PATCH /bookings/{id}` the page made, in order. */
async function patchesOf(request: Parameters<typeof apiRequests>[0]) {
  return (await bookingWriteCalls(request)).filter(
    (call) => call.method === "PATCH",
  );
}

async function detailReads(
  request: Parameters<typeof apiRequests>[0],
  id: string,
) {
  return (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === `/bookings/${id}`,
  ).length;
}

/** AC-15 */
test("a hold where only the note changed sends only the note, and an address that was cleared goes as null", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.bar);
  await expectPrivatePage(page);
  await expect(
    main(page).getByRole("heading", { name: "Editar reserva" }),
  ).toBeVisible();
  await expect(
    main(page).getByText("Bar El Molino", { exact: true }),
  ).toBeVisible();
  await expect(field(page, "Estado")).toHaveCount(0);
  await expect(field(page, "Vence el bloqueo")).toHaveValue("2030-03-08T12:00");
  await expect(field(page, "Entrega")).toHaveValue("2030-03-09T11:30");
  await expect(field(page, "Retiro")).toHaveValue("2030-03-09T19:00");
  await expect(field(page, "Flete")).toHaveValue("1.000");
  await expect(field(page, "Total")).toHaveValue("8.000");
  await field(page, "Nota").fill("Tocar el timbre");
  await save(page).click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.bar}`);
  await expect(valueOf(page, "Nota")).toHaveText("Tocar el timbre");

  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}/editar`);
  await expect(field(page, "Dirección")).toHaveValue(
    "Av. Costanera 1200, Corrientes",
  );
  await field(page, "Dirección").fill("");
  await save(page).click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.lucia}`);
  await expect(valueOf(page, "Dirección")).toHaveCount(0);

  const patches = await patchesOf(request);
  expect(patches.map((call) => call.path)).toEqual([
    `/bookings/${BOOKING_IDS.bar}`,
    `/bookings/${BOOKING_IDS.lucia}`,
  ]);
  expect(patches.map((call) => call.body)).toEqual([
    '{"note":"Tocar el timbre"}',
    '{"address":null}',
  ]);
  expect(patches[0].headers["idempotency-key"]).toBeUndefined();
});

/** AC-16 */
test("saving with nothing changed says so and sends nothing, also after typing something and erasing it", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.bar);
  await save(page).click();
  await expect(main(page).getByText(NOT_CHANGED)).toBeVisible();
  await field(page, "Nota").fill("Algo");
  await field(page, "Nota").fill("");
  await save(page).click();
  await expect(main(page).getByText(NOT_CHANGED)).toBeVisible();
  await expect(page).toHaveURL(/\/editar$/);
  expect(await patchesOf(request)).toEqual([]);
});

/** AC-17 */
test("a hold with a line added and one repriced sends the whole list with the price on those two and no total, and helps with the free units of the new one only", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.bar);
  await expect(line(page, COPA).getByLabel("Cantidad")).toHaveValue("20");
  await expect(line(page, COPA).getByLabel("Precio")).toHaveValue("350");
  await expect(line(page, COPA).getByText(/libres?$/)).toHaveCount(0);
  expect(await availabilityCalls(request)).toEqual([]);

  await addItem(page, SILLA);
  await line(page, SILLA).getByLabel("Cantidad").fill("10");
  await expect(line(page, SILLA).getByText("Hay 86 libres")).toBeVisible();
  await expect(line(page, COPA).getByText(/libres?$/)).toHaveCount(0);
  const asked = await availabilityCalls(request);
  expect(asked[asked.length - 1].get("ids")).toBe(ITEM_IDS.silla);

  await line(page, COPA).getByLabel("Precio").fill("400");
  await expect(
    main(page).getByText("Suma de líneas y flete: $ 24.000"),
  ).toBeVisible();
  await expect(field(page, "Total")).toHaveValue("8.000");
  await main(page).getByRole("button", { name: "20 %" }).click();
  await expect(field(page, "Seña")).toHaveValue("1.600");
  await field(page, "Fecha de la seña").fill("2030-03-01");
  await save(page).click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.bar}`);

  const patches = await patchesOf(request);
  expect(patches).toHaveLength(1);
  expect(patches[0].body).toBe(
    `{"deposit":{"amountCents":160000,"date":"2030-03-01"},"lines":[{"itemId":"${ITEM_IDS.copa}","quantity":20,"priceCents":40000},{"itemId":"${ITEM_IDS.silla}","quantity":10,"priceCents":150000}]}`,
  );
  await expect(main(page).getByText("Silla Tiffany blanca × 10")).toBeVisible();
  await expect(main(page).getByText("$ 400 c/u")).toBeVisible();
  await expect(valueOf(page, "Total")).toHaveText("$ 8.000");
  await expect(valueOf(page, "Seña")).toHaveText("$ 1.600 el vie 1 mar 2030");
  await expect(main(page).getByText("$ 6.400", { exact: true })).toBeVisible();
});

/** AC-18 */
test("a confirmed booking has its old prices and its deposit read only, no expiry, and a new quantity goes without any price", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.lucia);
  await expect(field(page, "Vence el bloqueo")).toHaveCount(0);
  for (const name of [SILLA, COPA]) {
    await expect(line(page, name).getByLabel("Precio")).not.toBeEditable();
    await expect(line(page, name).getByText(PRICE_FIXED)).toBeVisible();
    await expect(line(page, name).getByText(/libres?$/)).toHaveCount(0);
  }
  await expect(line(page, SILLA).getByLabel("Precio")).toHaveValue("1.500");
  await expect(field(page, "Seña")).toHaveValue("6.000");
  await expect(field(page, "Seña")).not.toBeEditable();
  await expect(field(page, "Fecha de la seña")).toHaveValue("2030-03-01");
  await expect(field(page, "Fecha de la seña")).not.toBeEditable();
  await expect(main(page).getByRole("button", { name: "20 %" })).toHaveCount(0);
  await expect(field(page, "Total")).toHaveValue("18.000");
  expect(await availabilityCalls(request)).toEqual([]);

  await line(page, SILLA).getByLabel("Cantidad").fill("9");
  await save(page).click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.lucia}`);
  const patches = await patchesOf(request);
  expect(patches).toHaveLength(1);
  expect(patches[0].body).toBe(
    `{"lines":[{"itemId":"${ITEM_IDS.silla}","quantity":9},{"itemId":"${ITEM_IDS.copa}","quantity":12}]}`,
  );
  await expect(main(page).getByText("Silla Tiffany blanca × 9")).toBeVisible();
});

/** AC-19 */
test("a delivered booking edits only the pickup, the address and the note, and sends only what changed", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.marcos);
  for (const label of [
    "Entrega",
    "Vence el bloqueo",
    "Fecha del evento",
    "Motivo",
    "Flete",
    "Total",
    "Seña",
    "Fecha de la seña",
  ]) {
    await expect(field(page, label)).toHaveCount(0);
  }
  for (const name of ["Cambiar cliente", "Agregar artículo"]) {
    await expect(main(page).getByRole("button", { name })).toHaveCount(0);
  }
  await expect(field(page, "Retiro")).toHaveValue("2030-03-24T19:00");
  await expect(field(page, "Dirección")).toHaveValue("Calle 9 de Julio 450");
  await expect(field(page, "Nota")).toBeVisible();

  await field(page, "Retiro").fill("2030-03-24T20:00");
  await save(page).click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.marcos}`);
  const patches = await patchesOf(request);
  expect(patches.map((call) => call.body)).toEqual([
    '{"pickupAt":"2030-03-24T20:00:00-03:00"}',
  ]);
  await expect(valueOf(page, "Retiro")).toHaveText("dom 24 mar 2030, 20:00");
});

/** AC-19, AC-21 */
test("a 409 insufficient_stock or item_archived on the pickup of a delivered booking names the item above Guardar, because its lines are not on screen", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.marcos);
  await expect(main(page).getByRole("group", { name: COPA })).toHaveCount(0);
  await field(page, "Retiro").fill("2030-03-26T20:00");
  const patchMarcos = {
    method: "PATCH",
    path: `/bookings/${BOOKING_IDS.marcos}`,
    status: 409,
  };

  await overrideNext(request, {
    ...patchMarcos,
    body: {
      error: "insufficient_stock",
      items: [{ itemId: ITEM_IDS.copa, requested: 30, available: 12 }],
    },
  });
  await save(page).click();
  await expect(
    main(page).getByText("Copa de vino: pediste 30 y hay 12 libres."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/editar$/);
  await expect(save(page)).toBeEnabled();
  await expect(field(page, "Retiro")).toHaveValue("2030-03-26T20:00");
  expect(await patchesOf(request)).toHaveLength(1);

  await overrideNext(request, {
    ...patchMarcos,
    body: { error: "item_archived", itemIds: [ITEM_IDS.copa] },
  });
  await save(page).click();
  await expect(
    main(page).getByText("Copa de vino: dado de baja."),
  ).toBeVisible();
  await expect(main(page).getByText(/pediste 30/)).toHaveCount(0);
  expect(await patchesOf(request)).toHaveLength(2);
});

/** AC-20 */
test("a returned or a cancelled booking has no Editar, and /editar goes back to its detail without a PATCH", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.asociacion}`);
  await expect(status(page)).toHaveText("Devuelta");
  await expect(editLink(page)).toHaveCount(0);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.asociacion}/editar`);
  await expect(page).toHaveURL(
    new RegExp(`/reservas/${BOOKING_IDS.asociacion}$`),
  );

  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await expect(editLink(page)).toBeVisible();
  await main(page).getByRole("button", { name: "Cancelar reserva" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancelar reserva" })
    .click();
  await expect(status(page)).toHaveText("Cancelada");
  await expect(editLink(page)).toHaveCount(0);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}/editar`);
  await expect(page).toHaveURL(new RegExp(`/reservas/${BOOKING_IDS.bar}$`));
  expect(await patchesOf(request)).toEqual([]);
});

/** AC-21 */
test("a 409 line_price_locked, deposit_already_set and booking_not_editable each say their own text, and the last asks for the booking again", async ({
  page,
  request,
}) => {
  await openEdit(page, BOOKING_IDS.bar);
  await field(page, "Nota").fill("Tocar el timbre");
  const patchBar = {
    method: "PATCH",
    path: `/bookings/${BOOKING_IDS.bar}`,
    status: 409,
  };

  await overrideNext(request, {
    ...patchBar,
    body: { error: "line_price_locked" },
  });
  await save(page).click();
  await expect(main(page).getByText(PRICE_LOCKED)).toBeVisible();

  await overrideNext(request, {
    ...patchBar,
    body: { error: "deposit_already_set" },
  });
  await save(page).click();
  await expect(main(page).getByText(DEPOSIT_SET)).toBeVisible();
  await expect(main(page).getByText(PRICE_LOCKED)).toHaveCount(0);

  const reads = await detailReads(request, BOOKING_IDS.bar);
  await overrideNext(request, {
    ...patchBar,
    body: { error: "booking_not_editable" },
  });
  await save(page).click();
  await expect(main(page).getByText(NOT_EDITABLE)).toBeVisible();
  await expect(main(page).getByText(DEPOSIT_SET)).toHaveCount(0);
  await expect
    .poll(() => detailReads(request, BOOKING_IDS.bar))
    .toBeGreaterThan(reads);
  await expect(page).toHaveURL(/\/editar$/);
  await expect(field(page, "Nota")).toHaveValue("Tocar el timbre");
  expect(await patchesOf(request)).toHaveLength(3);
});

/** AC-22, AC-23 */
test("Ana and Marta see Editar as a link with a border, not as a button", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await expect(editLink(page)).toHaveAttribute(
    "href",
    `/reservas/${BOOKING_IDS.lucia}/editar`,
  );
  await expect(editLink(page)).not.toHaveCSS("border-top-color", TRANSPARENT);
  expect(await main(page).getByRole("button").allInnerTexts()).toEqual([
    "Entregar",
    "Cancelar reserva",
  ]);

  await signInThroughProxy(page, USERS.marta.email, USERS.marta.password);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await expect(editLink(page)).toBeVisible();
});

/** AC-22 */
for (const [name, user, id, customer] of [
  ["Beto, who is crew", USERS.beto, BOOKING_IDS.lucia, LUCIA],
  [
    "Olga, whose business is read only",
    USERS.olga,
    BOOKING_IDS.olga,
    "Cliente de Olga",
  ],
] as const) {
  test(`${name}, is taken back to the list from /editar without asking for the booking, and sees no Editar`, async ({
    page,
    request,
  }) => {
    await signInThroughProxy(page, user.email, user.password);
    await openItemsScreen(page, `/reservas/${id}/editar`);
    await expect(page).toHaveURL(/\/reservas$/);
    expect(await detailReads(request, id)).toBe(0);

    await openItemsScreen(page, `/reservas/${id}`);
    await expect(
      main(page).getByRole("heading", { name: customer }),
    ).toBeVisible();
    await expect(editLink(page)).toHaveCount(0);
    expect(await patchesOf(request)).toEqual([]);
  });
}
