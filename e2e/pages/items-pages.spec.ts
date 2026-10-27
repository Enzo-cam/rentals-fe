import { expect, test } from "@playwright/test";

import { resetFakeApi } from "../support/fake-api-control";
import { expectPrivatePage } from "../support/private-page";
import { ITEM_IDS, openItemsScreen, TABLON } from "../support/items";
import { signInThroughProxy, USERS } from "../support/session";

test.beforeEach(async ({ request }) => {
  await resetFakeApi(request);
});

/** AC-22: INV-FE-03 and 360 px, with the longest item name of the fixtures on screen. */
test("/articulos is Spanish, not indexable and fits in 360 px", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, "/articulos");
  await page.getByRole("listitem").nth(2).waitFor();
  await expectPrivatePage(page);
});

/** AC-22 */
test("the detail of the longest item name is Spanish, not indexable and fits in 360 px", async ({
  page,
}) => {
  await signInThroughProxy(page, USERS.ana.email, USERS.ana.password);
  await openItemsScreen(page, `/articulos/${ITEM_IDS.tablon}`);
  await expect(page.getByRole("heading", { name: TABLON })).toBeVisible();
  await expectPrivatePage(page);
});
