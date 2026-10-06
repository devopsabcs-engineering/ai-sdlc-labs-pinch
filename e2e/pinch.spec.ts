import { expect, test, type Page } from "@playwright/test";

const appPath = "./";

function assertFirstPartyRequests(page: Page): void {
  page.on("request", (request) => {
    expect(new URL(request.url()).origin).toBe("http://127.0.0.1:4173");
  });
}

test.beforeEach(async ({ page }) => {
  assertFirstPartyRequests(page);
  await page.goto(appPath);
});

test("scales a recipe, toggles units, shops, cooks, and switches EN/FR", async ({
  page,
}) => {
  await expect(page.locator("[data-recipe-title]")).toHaveText(
    "Everyday crêpes",
  );

  await page.locator("[data-increase]").click();
  await expect(page.locator("[data-servings]")).toHaveText("5");
  await expect(page.locator("[data-ingredient-list]")).toContainText("296 mL");

  await page.locator('[data-unit="imperial"]').click();
  await expect(page.locator('[data-unit="imperial"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-ingredient-list]")).toContainText(
    "1 1/4 cup",
  );

  await page.locator("[data-add-shopping]").click();
  await expect(page.locator("[data-shopping-list] input")).toHaveCount(3);
  await page.locator("[data-shopping-list] input").first().check();
  await expect(
    page.locator("[data-shopping-list] input").first(),
  ).toBeChecked();

  await page.locator("[data-start-cook]").click();
  await expect(page.locator("[data-cook-dialog]")).toBeVisible();
  await expect(page.locator("[data-cook-step]")).toHaveText(
    "Whisk the ingredients until smooth.",
  );
  await page.locator("[data-next-step]").click();
  await expect(page.locator("[data-cook-step]")).toHaveText(
    "Cook thin layers in a hot pan.",
  );
  await page.locator("[data-close-cook]").click();

  await page.locator("#locale-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("[data-recipe-title]")).toHaveText(
    "Crêpes de tous les jours",
  );
  await expect(page.locator("[data-shopping-title]")).toContainText(
    "Liste de courses",
  );
});

test("starts offline from its service worker cache", async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator("[data-recipe-title]")).toHaveText(
    "Everyday crêpes",
  );
  await expect(page.locator("[data-increase]")).toBeEnabled();
});
