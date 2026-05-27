import { expect, test } from "@playwright/test";

test("keeps the app share action in the header menu without a standalone banner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("install-prompt-banner")).toHaveCount(0);
  await expect(page.getByTestId("desktop-primary-nav")).toBeVisible();
  await page.getByTestId("desktop-guide-menu-button").click();
  await expect(page.getByTestId("open-share-dialog-button")).toBeVisible();
});

test("shows mobile navigation without the admin action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByTestId("mobile-menu-button")).toBeVisible();
  await page.getByTestId("mobile-menu-button").click();
  await expect(page.getByTestId("mobile-nav-menu")).toBeVisible();
  await expect(page.getByTestId("mobile-doubles-tab")).toContainText("対戦表(ダブルス)");
  await expect(page.getByTestId("mobile-singles-tab")).toContainText("近日公開予定");
  await expect(page.getByTestId("admin-nav-link")).toBeHidden();

  await page.getByTestId("mobile-menu-button").click();
  await expect(page.getByTestId("mobile-nav-menu")).toHaveCount(0);
});

test("opens the mobile navigation without moving the conditions panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const beforeBox = await page.getByTestId("condition-form").boundingBox();
  await page.getByTestId("mobile-menu-button").click();
  const afterBox = await page.getByTestId("condition-form").boundingBox();

  expect(Math.abs((afterBox?.y ?? 0) - (beforeBox?.y ?? 0))).toBeLessThan(1);
  await expect(page.getByTestId("mobile-nav-menu")).toBeVisible();
});

test("keeps the header sticky while scrolling", async ({ page }) => {
  await page.goto("/");

  const initialBox = await page.getByTestId("app-header").boundingBox();
  await page.evaluate(() => window.scrollTo(0, 520));
  const headerBox = await page.getByTestId("app-header").boundingBox();

  expect(headerBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(32);
  expect(Math.abs((headerBox?.y ?? 0) - (initialBox?.y ?? 0))).toBeLessThan(1);
});

test("serves a valid web manifest", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.name).toBe("テニス対戦組合せApp");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icons/icon-192.png" }),
      expect.objectContaining({ src: "/icons/icon-512.png" }),
    ]),
  );
});
