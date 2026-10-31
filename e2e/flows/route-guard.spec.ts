import { expect, test } from "@playwright/test";

import { FRONT_ORIGIN } from "../support/env";
import { apiRequests, resetFakeApi } from "../support/fake-api-control";

const ITEM_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const GUARDED = [
  "/cuenta",
  "/elegir-negocio",
  "/articulos",
  "/articulos/nuevo",
  `/articulos/${ITEM_ID}`,
  `/articulos/${ITEM_ID}/editar`,
  "/articulos/cargar-lista",
  "/clientes",
  "/clientes/nuevo",
];
const UNGUARDED = ["/", "/ingresar", "/definir-contrasena"];

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-17 */
test.describe("route guard without a session cookie", () => {
  for (const path of GUARDED) {
    test(`${path} → 307 to /ingresar, and the API is not called`, async ({
      request,
    }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location, FRONT_ORIGIN).pathname).toBe(
        "/ingresar",
      );

      const calls = await apiRequests(request);
      expect(calls.filter((call) => call.path === "/me")).toEqual([]);
    });
  }

  test("a request with the cookie is not redirected: the API decides", async ({
    request,
  }) => {
    for (const path of GUARDED) {
      const response = await request.get(path, {
        maxRedirects: 0,
        headers: { cookie: "__Host-session=anything" },
      });
      expect(response.status()).not.toBe(307);
    }
  });

  for (const path of UNGUARDED) {
    test(`${path} has no guard`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
    });
  }
});
