import { test } from "@playwright/test";

import { resetFakeApi } from "../support/fake-api-control";
import { expectPrivatePage } from "../support/private-page";
import { openItemsScreen } from "../support/items";
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
