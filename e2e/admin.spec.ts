import { expect, test } from "@playwright/test";

test("admin close button returns to the previous screen", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("admin-nav-link").click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId("admin-close-button")).toBeVisible();

  await page.getByTestId("admin-close-button").click();
  await expect(page).toHaveURL(/\/$/);
});
