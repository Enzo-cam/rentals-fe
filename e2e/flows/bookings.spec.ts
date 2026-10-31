import { expect, test, type Page } from "@playwright/test";

import {
  BOOKING_IDS,
  bookingListCalls,
  confirmed,
  hold,
  pageOf,
  pageWithoutPrices,
  withoutPrices,
} from "../support/bookings";
import { overrideNext, resetFakeApi } from "../support/fake-api-control";
import { openItemsScreen } from "../support/items";
import { expectPrivatePage } from "../support/private-page";
import { signInThroughProxy, USERS } from "../support/session";

const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
const MISSING = "Esta reserva no existe o no es de tu negocio.";
const EMPTY = "Todavía no hay reservas.";
const EMPTY_FILTERED = "No hay reservas con este estado.";
const UNKNOWN_ID = "cccccccc-0000-4000-8000-0000000000ff";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

const rows = (page: Page) => page.getByRole("main").getByRole("listitem");
const status = (page: Page) => page.getByLabel("Estado");

async function signInAsAna(page: Page) {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
}

function valueOf(page: Page, label: string) {
  return page
    .locator("dt")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator("xpath=following-sibling::dd");
}

/** AC-7 */
test("the list shows each booking in the order of the API with its dates, pill and saldo, and Ver más asks for the next cursor", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/reservas");
  await expect(page.getByRole("heading", { name: "Reservas" })).toBeVisible();
  await expect(rows(page)).toHaveCount(3);
  await expect(rows(page).nth(0)).toContainText("Lucía Benítez");
  await expect(rows(page).nth(0)).toContainText(
    "vie 8 mar 2030, 08:00 → dom 10 mar 2030, 17:00",
  );
  await expect(rows(page).nth(0)).toContainText("Confirmada");
  await expect(rows(page).nth(0)).toContainText("Saldo $ 12.000");
  await expect(
    rows(page)
      .nth(0)
      .getByRole("link", { name: /Lucía Benítez/ }),
  ).toHaveAttribute("href", `/reservas/${BOOKING_IDS.lucia}`);
  await expect(rows(page).nth(1)).toContainText("Bar El Molino");
  await expect(rows(page).nth(1)).toContainText(
    "sáb 9 mar 2030, 11:30 → sáb 9 mar 2030, 19:00",
  );
  await expect(
    rows(page).nth(1).getByText("Bloqueo", { exact: true }),
  ).toBeVisible();
  await expect(rows(page).nth(1)).toContainText("Saldo $ 8.000");
  await expect(rows(page).nth(2)).toContainText("Ana Gómez");
  await expect(rows(page).nth(2)).toContainText("Bloqueo vencido");

  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).nth(3)).toContainText("Marcos Ríos");
  await expect(rows(page).nth(3)).toContainText("Entregada");
  await expect(rows(page).nth(4)).toContainText("Devuelta");
  await expect(rows(page).nth(4)).toContainText("Saldo $ 0");
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);
  await expect(rows(page).nth(4)).toContainText("Asociación de Eventos");
  await expectPrivatePage(page);

  const calls = await bookingListCalls(request);
  expect(calls).toHaveLength(2);
  expect(calls[0].has("status")).toBe(false);
  expect(calls[0].has("cursor")).toBe(false);
  expect(calls[0].has("limit")).toBe(false);
  expect(calls[1].get("cursor")).toBe("b-3");
  expect(calls[1].has("status")).toBe(false);
  expect(calls[1].has("limit")).toBe(false);
});

/** AC-7 */
test("a booking that the next page repeats shows once", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    status: 200,
    body: pageOf([confirmed, hold], "b-2"),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    query: { cursor: "b-2" },
    status: 200,
    body: pageOf([hold], null),
  });
  await openItemsScreen(page, "/reservas");
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByText("Bar El Molino")).toHaveCount(1);
});

/** AC-7 */
test("an empty list says so and offers no Ver más", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    status: 200,
    body: pageOf([], null),
  });
  await openItemsScreen(page, "/reservas");
  await expect(page.getByText(EMPTY, { exact: true })).toBeVisible();
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
    path: "/bookings",
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, "/reservas");
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);
});

/** AC-8 */
test("the status select offers every status, puts the API value in the URL and the request, and a reload keeps it", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    query: { status: "confirmed" },
    times: 2,
    status: 200,
    body: pageOf([confirmed], null),
  });
  await openItemsScreen(page, "/reservas");
  await expect(status(page).locator("option")).toHaveText([
    "Todas",
    "Bloqueo",
    "Confirmada",
    "Entregada",
    "Devuelta",
    "Cancelada",
  ]);
  await status(page).selectOption({ label: "Confirmada" });
  await page.waitForURL("**/reservas?status=confirmed");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Lucía Benítez");

  await page.reload();
  await expect(status(page)).toHaveValue("confirmed");
  await expect(rows(page)).toHaveCount(1);

  const calls = await bookingListCalls(request);
  expect(calls.map((call) => call.get("status"))).toEqual([
    null,
    "confirmed",
    "confirmed",
  ]);
});

/** AC-8 */
test("Ver más in a filtered list asks for the next page with the same status and the cursor, and Todas goes back to the whole list", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    query: { status: "hold", cursor: "b-1" },
    status: 200,
    body: pageOf([hold], null),
  });
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    query: { status: "hold" },
    status: 200,
    body: pageOf([confirmed], "b-1"),
  });
  await openItemsScreen(page, "/reservas?status=hold");
  await expect(status(page)).toHaveValue("hold");
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Ver más" }).click();
  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Ver más" })).toHaveCount(0);

  const calls = await bookingListCalls(request);
  expect(calls[calls.length - 1].get("status")).toBe("hold");
  expect(calls[calls.length - 1].get("cursor")).toBe("b-1");

  await status(page).selectOption({ label: "Todas" });
  await page.waitForURL(/\/reservas$/);
  await expect(rows(page)).toHaveCount(3);
  const last = (await bookingListCalls(request)).at(-1);
  expect(last?.has("status")).toBe(false);
});

/** AC-8 */
test("a filtered list with no bookings says so", async ({ page, request }) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    query: { status: "cancelled" },
    status: 200,
    body: pageOf([], null),
  });
  await openItemsScreen(page, "/reservas?status=cancelled");
  await expect(page.getByText(EMPTY_FILTERED, { exact: true })).toBeVisible();
});

/** AC-8 */
test("a status that is garbage in the URL never reaches the API and shows every booking", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/reservas?status=foo");
  await expect(rows(page)).toHaveCount(3);
  await expect(status(page)).toHaveValue("");

  const calls = await bookingListCalls(request);
  expect(calls).toHaveLength(1);
  expect(calls[0].has("status")).toBe(false);
});

/** AC-9 */
test("the primary action is Consultar disponibilidad and it goes to the availability", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/reservas");
  const action = page
    .getByRole("main")
    .getByRole("link", { name: "Consultar disponibilidad" });
  await expect(action).toHaveAttribute("href", "/disponibilidad");
  await action.click();
  await page.waitForURL("**/disponibilidad");
});

/** AC-10 */
test("tapping a row opens the detail of a confirmed booking with every field the API sends", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, "/reservas");
  await rows(page)
    .nth(0)
    .getByRole("link", { name: /Lucía Benítez/ })
    .click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.lucia}`);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Reserva" })).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Lucía Benítez" }),
  ).toBeVisible();
  await expect(main).toContainText("3794 555000");
  await expect(main.getByText("Confirmada", { exact: true })).toBeVisible();
  await expect(valueOf(page, "Entrega")).toHaveText("vie 8 mar 2030, 08:00");
  await expect(valueOf(page, "Retiro")).toHaveText("dom 10 mar 2030, 17:00");
  await expect(valueOf(page, "Dirección")).toHaveText(
    "Av. Costanera 1200, Corrientes",
  );
  await expect(valueOf(page, "Nota")).toHaveText("Llevar mantel de repuesto");
  await expect(valueOf(page, "Vence el bloqueo")).toHaveCount(0);
  await expect(valueOf(page, "Entregada")).toHaveCount(0);
  await expect(valueOf(page, "Vuelta registrada")).toHaveCount(0);
  await expect(valueOf(page, "Cancelada")).toHaveCount(0);
  await expect(main.getByText("Silla Tiffany blanca × 8")).toBeVisible();
  await expect(main.getByText("$ 1.500 c/u")).toBeVisible();
  await expect(main.getByText("Copa de vino × 12")).toBeVisible();
  await expect(main.getByText("$ 350 c/u")).toBeVisible();
  await expect(valueOf(page, "Flete")).toHaveText("$ 1.800");
  await expect(valueOf(page, "Seña")).toHaveText("$ 6.000 el vie 1 mar 2030");
  await expect(main.getByText("Saldo a cobrar")).toBeVisible();
  await expect(main.getByText("$ 12.000", { exact: true })).toHaveCSS(
    "font-weight",
    "800",
  );
  await expect(
    main.getByRole("link", { name: "Volver a las reservas" }),
  ).toHaveAttribute("href", "/reservas");
  await expectPrivatePage(page);
});

/** AC-10 */
test("a hold shows when the bloqueo expires, and no address, note or deposit means no such field", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await expect(
    page.getByRole("heading", { name: "Bar El Molino" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Bloqueo", { exact: true }),
  ).toBeVisible();
  await expect(valueOf(page, "Vence el bloqueo")).toHaveText(
    "vie 8 mar 2030, 12:00",
  );
  await expect(valueOf(page, "Dirección")).toHaveCount(0);
  await expect(valueOf(page, "Nota")).toHaveCount(0);
  await expect(valueOf(page, "Seña")).toHaveCount(0);
  await expect(valueOf(page, "Flete")).toHaveText("$ 1.000");
  await expect(page.getByText("$ 8.000", { exact: true })).toBeVisible();
});

/** AC-10 */
test("an expired hold says Bloqueo vencido, and delivered, returned and cancelled dates show only when the API sends them", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: `/bookings/${BOOKING_IDS.ana}`,
    status: 200,
    body: {
      ...hold,
      id: BOOKING_IDS.ana,
      holdExpired: true,
      deliveredAt: "2030-03-08T11:20:00Z",
      returnRecordedAt: "2030-03-10T20:30:00Z",
      cancelledAt: "2030-03-11T15:00:00Z",
    },
  });
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.ana}`);
  await expect(
    page.getByRole("main").getByText("Bloqueo vencido"),
  ).toBeVisible();
  await expect(valueOf(page, "Entregada")).toHaveText("vie 8 mar 2030, 08:20");
  await expect(valueOf(page, "Vuelta registrada")).toHaveText(
    "dom 10 mar 2030, 17:30",
  );
  await expect(valueOf(page, "Cancelada")).toHaveText("lun 11 mar 2030, 12:00");
});

/** AC-11 */
test("the crew gets the booking without prices, and Olga, whose business is read only, still reads the list and a detail", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    status: 200,
    body: pageWithoutPrices([confirmed, hold], null),
  });
  await overrideNext(request, {
    method: "GET",
    path: `/bookings/${BOOKING_IDS.lucia}`,
    status: 200,
    body: withoutPrices(confirmed),
  });
  await openItemsScreen(page, "/reservas");
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(0)).toContainText("Saldo $ 12.000");
  await rows(page)
    .nth(0)
    .getByRole("link", { name: /Lucía Benítez/ })
    .click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.lucia}`);
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "Lucía Benítez" }),
  ).toBeVisible();
  await expect(valueOf(page, "Nota")).toHaveText("Llevar mantel de repuesto");
  await expect(main.getByText("Silla Tiffany blanca × 8")).toBeVisible();
  await expect(main.getByText("Saldo a cobrar")).toBeVisible();
  await expect(main.getByText("$ 12.000", { exact: true })).toBeVisible();
  await expect(main).not.toContainText("c/u");
  await expect(main).not.toContainText("$ 1.500");
  await expect(valueOf(page, "Flete")).toHaveCount(0);
  await expect(valueOf(page, "Seña")).toHaveCount(0);

  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings",
    status: 200,
    body: pageOf([confirmed], null),
  });
  await overrideNext(request, {
    method: "GET",
    path: `/bookings/${BOOKING_IDS.lucia}`,
    status: 200,
    body: confirmed,
  });
  await openItemsScreen(page, "/reservas");
  await expect(rows(page)).toHaveCount(1);
  await rows(page)
    .first()
    .getByRole("link", { name: /Lucía Benítez/ })
    .click();
  await page.waitForURL(`**/reservas/${BOOKING_IDS.lucia}`);
  await expect(valueOf(page, "Nota")).toHaveText("Llevar mantel de repuesto");
});

/** AC-12 */
test("a booking that does not exist, or is not from the business, says so", async ({
  page,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${UNKNOWN_ID}`);
  await expect(page.getByText(MISSING)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Volver a las reservas" }),
  ).toBeVisible();

  await openItemsScreen(page, "/reservas/cccccccc-0000-4000-8000-000000000006");
  await expect(page.getByText(MISSING)).toBeVisible();
});

/** AC-12 */
test("an id that is not a UUID gets the API's 400 and says the same", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: "/bookings/x",
    status: 400,
    body: { error: "invalid_request" },
  });
  await openItemsScreen(page, "/reservas/x");
  await expect(page.getByText(MISSING)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
});

/** AC-12 */
test("a 502 on the detail shows the error and Reintentar asks again", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await overrideNext(request, {
    method: "GET",
    path: `/bookings/${BOOKING_IDS.lucia}`,
    times: 2,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(
    page.getByRole("heading", { name: "Lucía Benítez" }),
  ).toBeVisible();
  await expect(page.getByText(UNAVAILABLE)).toHaveCount(0);
});
