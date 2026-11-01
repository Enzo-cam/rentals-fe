import { expect, test, type Page } from "@playwright/test";

import {
  BOOKING_IDS,
  bookingActionCalls,
  confirmed,
} from "../support/bookings";
import {
  apiRequests,
  overrideNext,
  resetFakeApi,
} from "../support/fake-api-control";
import { ITEM_IDS, openItemsScreen } from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNAVAILABLE =
  "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
const CHANGED = "Esta reserva cambió mientras tanto. Mirá cómo quedó.";
const READ_ONLY =
  "No se guardó: tu negocio está en solo lectura. Escribinos para reactivarlo.";
const FORBIDDEN =
  "Tu rol no permite hacer esto. Si lo necesitás, pedíselo al dueño del negocio.";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

const main = (page: Page) => page.getByRole("main");
const status = (page: Page) => main(page).locator("[data-slot=badge]");
const action = (page: Page, name: string) =>
  main(page).getByRole("button", { name, exact: true });

async function signInAsAna(page: Page) {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
}

async function buttonsOf(page: Page) {
  return main(page).getByRole("button").allInnerTexts();
}

function meOf(role: "owner" | "manager" | "crew", readOnly: boolean) {
  return {
    user: {
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      name: "Ana",
      email: "ana@example.com",
    },
    role,
    business: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Alquileres y Eventos Ana",
      readOnly,
    },
  };
}

async function meCalls(request: Parameters<typeof apiRequests>[0]) {
  return (await apiRequests(request)).filter(
    (call) => call.method === "GET" && call.path === "/me",
  ).length;
}

/** AC-1, AC-2 */
test("the buttons follow the status: Confirmar, Entregar and Registrar la vuelta, each tap with its own key, no dialog, disabled while it travels", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await expect(status(page)).toHaveText("Bloqueo");
  await expect(action(page, "Confirmar")).toBeVisible();
  await expect(action(page, "Cancelar reserva")).toBeVisible();
  expect(await buttonsOf(page)).toEqual(["Confirmar", "Cancelar reserva"]);

  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.bar}/confirm`,
    delayMs: 800,
  });
  await overrideNext(request, {
    method: "GET",
    path: `/bookings/${BOOKING_IDS.bar}`,
    delayMs: 1500,
  });
  const answered = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/bookings/${BOOKING_IDS.bar}/confirm`),
  );
  await action(page, "Confirmar").click();
  await expect(action(page, "Confirmar")).toBeDisabled();
  await answered;
  await page.waitForTimeout(300);
  await expect(status(page)).toHaveText("Bloqueo");
  await expect(action(page, "Confirmar")).toBeDisabled();
  await expect(action(page, "Cancelar reserva")).toBeDisabled();
  await expect(status(page)).toHaveText("Confirmada");
  await expect(action(page, "Entregar")).toBeEnabled();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(await buttonsOf(page)).toEqual(["Entregar", "Cancelar reserva"]);
  await expect(page.getByText("Vence el bloqueo")).toHaveCount(0);

  await action(page, "Entregar").click();
  await expect(status(page)).toHaveText("Entregada");
  expect(await buttonsOf(page)).toEqual(["Registrar la vuelta"]);

  await action(page, "Registrar la vuelta").click();
  await expect(status(page)).toHaveText("Devuelta");
  expect(await buttonsOf(page)).toEqual([]);

  const calls = await bookingActionCalls(request);
  expect(calls.map((call) => call.path)).toEqual([
    `/bookings/${BOOKING_IDS.bar}/confirm`,
    `/bookings/${BOOKING_IDS.bar}/deliver`,
    `/bookings/${BOOKING_IDS.bar}/return`,
  ]);
  const keys = calls.map((call) => call.headers["idempotency-key"]);
  for (const key of keys) expect(key).toMatch(UUID);
  expect(new Set(keys).size).toBe(3);
  for (const call of calls) {
    expect(call.headers["content-type"]).toContain("application/json");
    expect(call.body).toBeNull();
  }
});

/** AC-1 */
test("each status offers its own buttons, an expired hold still offers Confirmar and Cancelar reserva, and a manager gets the same as the owner", async ({
  page,
}) => {
  await signInAsAna(page);
  const cases: [string, string[]][] = [
    [BOOKING_IDS.lucia, ["Entregar", "Cancelar reserva"]],
    [BOOKING_IDS.ana, ["Confirmar", "Cancelar reserva"]],
    [BOOKING_IDS.marcos, ["Registrar la vuelta"]],
    [BOOKING_IDS.asociacion, []],
  ];
  for (const [id, buttons] of cases) {
    await openItemsScreen(page, `/reservas/${id}`);
    await expect(status(page)).toBeVisible();
    expect(await buttonsOf(page)).toEqual(buttons);
  }
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.ana}`);
  await expect(status(page)).toHaveText("Bloqueo vencido");

  await signInThroughProxy(page, USERS.marta.email, USERS.marta.password);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await expect(status(page)).toHaveText("Bloqueo");
  expect(await buttonsOf(page)).toEqual(["Confirmar", "Cancelar reserva"]);
});

/** AC-1, AC-6 */
test("the crew sees only Entregar on a confirmed booking and only Registrar la vuelta on a delivered one, and never a price", async ({
  page,
  request,
}) => {
  await signInThroughProxy(page, USERS.beto.email, USERS.beto.password);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await expect(status(page)).toHaveText("Bloqueo");
  expect(await buttonsOf(page)).toEqual([]);

  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await expect(status(page)).toHaveText("Confirmada");
  expect(await buttonsOf(page)).toEqual(["Entregar"]);
  await expect(main(page)).not.toContainText("c/u");

  await action(page, "Entregar").click();
  await expect(status(page)).toHaveText("Entregada");
  expect(await buttonsOf(page)).toEqual(["Registrar la vuelta"]);
  await expect(main(page)).not.toContainText("c/u");
  await expect(main(page)).not.toContainText("Flete");

  await action(page, "Registrar la vuelta").click();
  await expect(status(page)).toHaveText("Devuelta");
  expect(await buttonsOf(page)).toEqual([]);

  const calls = await bookingActionCalls(request);
  expect(calls.map((call) => call.path)).toEqual([
    `/bookings/${BOOKING_IDS.lucia}/deliver`,
    `/bookings/${BOOKING_IDS.lucia}/return`,
  ]);
});

/** AC-1 */
test("a business in read only mode gets no actions", async ({ page }) => {
  await signInThroughProxy(page, USERS.olga.email, USERS.olga.password);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.olga}`);
  await expect(status(page)).toHaveText("Confirmada");
  expect(await buttonsOf(page)).toEqual([]);
});

/** AC-3 */
test("Cancelar reserva asks first: Volver sends nothing, and confirming cancels and leaves no actions", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await action(page, "Cancelar reserva").click();
  const dialog = page.getByRole("alertdialog", {
    name: "¿Cancelar la reserva de Lucía Benítez?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Se liberan las unidades al instante. La seña queda como está.",
  );
  await dialog.getByRole("button", { name: "Volver" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(status(page)).toHaveText("Confirmada");
  expect(await bookingActionCalls(request)).toHaveLength(0);

  await action(page, "Cancelar reserva").click();
  await dialog.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(status(page)).toHaveText("Cancelada");
  expect(await buttonsOf(page)).toEqual([]);

  const calls = await bookingActionCalls(request);
  expect(calls).toHaveLength(1);
  expect(calls[0].path).toBe(`/bookings/${BOOKING_IDS.lucia}/cancel`);
  expect(calls[0].headers["idempotency-key"]).toMatch(UUID);
});

/** AC-4 */
test("a cut connection shows the error, the button works again and the second tap repeats the same key; the next action has another", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.bar}/confirm`,
    mode: "reset",
  });
  await action(page, "Confirmar").click();
  await expect(main(page).getByRole("alert")).toHaveText(UNAVAILABLE);
  await expect(action(page, "Confirmar")).toBeEnabled();
  await expect(status(page)).toHaveText("Bloqueo");

  await action(page, "Confirmar").click();
  await expect(status(page)).toHaveText("Confirmada");
  await expect(main(page).getByRole("alert")).toHaveCount(0);

  await action(page, "Entregar").click();
  await expect(status(page)).toHaveText("Entregada");

  const calls = await bookingActionCalls(request);
  expect(calls.map((call) => call.path)).toEqual([
    `/bookings/${BOOKING_IDS.bar}/confirm`,
    `/bookings/${BOOKING_IDS.bar}/confirm`,
    `/bookings/${BOOKING_IDS.bar}/deliver`,
  ]);
  const keys = calls.map((call) => call.headers["idempotency-key"]);
  expect(keys[0]).toMatch(UUID);
  expect(keys[1]).toBe(keys[0]);
  expect(keys[2]).toMatch(UUID);
  expect(keys[2]).not.toBe(keys[0]);
});

/** AC-4 */
test("each action has its own key: after a failed Confirmar, Cancelar reserva does not reuse it", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.bar}`);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.bar}/confirm`,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await action(page, "Confirmar").click();
  await expect(main(page).getByRole("alert")).toHaveText(UNAVAILABLE);

  await action(page, "Cancelar reserva").click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancelar reserva" })
    .click();
  await expect(status(page)).toHaveText("Cancelada");

  const calls = await bookingActionCalls(request);
  expect(calls.map((call) => call.path)).toEqual([
    `/bookings/${BOOKING_IDS.bar}/confirm`,
    `/bookings/${BOOKING_IDS.bar}/cancel`,
  ]);
  expect(calls[0].headers["idempotency-key"]).toMatch(UUID);
  expect(calls[1].headers["idempotency-key"]).toMatch(UUID);
  expect(calls[1].headers["idempotency-key"]).not.toBe(
    calls[0].headers["idempotency-key"],
  );
});

/** AC-4, AC-5 */
test("an expired hold that no longer fits names each item, and a retry after the 409 repeats the same key", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.ana}`);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.ana}/confirm`,
    status: 409,
    body: {
      error: "insufficient_stock",
      items: [
        { itemId: ITEM_IDS.silla, requested: 2, available: 1 },
        {
          itemId: "bbbbbbbb-0000-4000-8000-0000000000ff",
          requested: 1200,
          available: 0,
        },
      ],
    },
  });
  await action(page, "Confirmar").click();
  const alert = main(page).getByRole("alert");
  await expect(alert).toContainText(
    "Silla Tiffany blanca: pediste 2 y hay 1 libre.",
  );
  await expect(alert).toContainText("pediste 1.200 y hay 0 libres.");
  await expect(action(page, "Confirmar")).toBeEnabled();
  await expect(status(page)).toHaveText("Bloqueo vencido");

  await action(page, "Confirmar").click();
  await expect(status(page)).toHaveText("Confirmada");

  const calls = await bookingActionCalls(request);
  expect(calls).toHaveLength(2);
  expect(calls[1].headers["idempotency-key"]).toMatch(UUID);
  expect(calls[1].headers["idempotency-key"]).toBe(
    calls[0].headers["idempotency-key"],
  );
});

/** AC-5 */
test("an archived item and a pickup in the past say what to do, and the booking stays a hold", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.ana}`);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.ana}/confirm`,
    status: 409,
    body: { error: "item_archived", itemIds: [ITEM_IDS.silla] },
  });
  await action(page, "Confirmar").click();
  await expect(main(page).getByRole("alert")).toHaveText(
    "Silla Tiffany blanca: dado de baja.",
  );

  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.ana}/confirm`,
    status: 400,
    body: { error: "pickup_in_past" },
  });
  await action(page, "Confirmar").click();
  await expect(main(page).getByRole("alert")).toHaveText(
    "El retiro ya pasó: cambiale la fecha antes de confirmar.",
  );
  await expect(status(page)).toHaveText("Bloqueo vencido");
  await expect(action(page, "Confirmar")).toBeEnabled();
});

/** AC-5 */
test("a booking that changed on another phone says so and shows how it is now", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await expect(status(page)).toHaveText("Confirmada");
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.lucia}/deliver`,
    status: 409,
    body: { error: "invalid_transition" },
  });
  await overrideNext(request, {
    method: "GET",
    path: `/bookings/${BOOKING_IDS.lucia}`,
    status: 200,
    body: {
      ...confirmed,
      status: "delivered",
      deliveredAt: "2030-03-08T11:20:00Z",
    },
  });
  await action(page, "Entregar").click();
  await expect(main(page).getByRole("alert")).toHaveText(CHANGED);
  await expect(status(page)).toHaveText("Entregada");
  expect(await buttonsOf(page)).toEqual(["Registrar la vuelta"]);
});

/** AC-5 */
test("a 403 read_only asks who I am again and the actions disappear", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await expect(action(page, "Entregar")).toBeVisible();
  const before = await meCalls(request);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.lucia}/deliver`,
    status: 403,
    body: { error: "read_only" },
  });
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 200,
    body: meOf("owner", true),
  });
  await action(page, "Entregar").click();
  await expect(main(page).getByRole("alert")).toHaveText(READ_ONLY);
  await expect.poll(() => meCalls(request)).toBeGreaterThan(before);
  await expect(action(page, "Entregar")).toHaveCount(0);
  expect(await buttonsOf(page)).toEqual([]);
});

/** AC-5 */
test("a 403 forbidden asks who I am again and the actions of the old role disappear", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  const before = await meCalls(request);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.lucia}/cancel`,
    status: 403,
    body: { error: "forbidden" },
  });
  await overrideNext(request, {
    method: "GET",
    path: "/me",
    status: 200,
    body: meOf("crew", false),
  });
  await action(page, "Cancelar reserva").click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancelar reserva" })
    .click();
  await expect(main(page).getByRole("alert")).toHaveText(FORBIDDEN);
  await expect.poll(() => meCalls(request)).toBeGreaterThan(before);
  expect(await buttonsOf(page)).toEqual(["Entregar"]);
});

/** AC-5 */
test("a 502 shows the generic error and the button is ready for another try", async ({
  page,
  request,
}) => {
  await signInAsAna(page);
  await openItemsScreen(page, `/reservas/${BOOKING_IDS.lucia}`);
  await overrideNext(request, {
    method: "POST",
    path: `/bookings/${BOOKING_IDS.lucia}/deliver`,
    status: 502,
    body: { error: "upstream_unavailable" },
  });
  await action(page, "Entregar").click();
  await expect(main(page).getByRole("alert")).toHaveText(UNAVAILABLE);
  await expect(action(page, "Entregar")).toBeEnabled();
  await action(page, "Entregar").click();
  await expect(status(page)).toHaveText("Entregada");
});
