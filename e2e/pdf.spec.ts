import { expect, test } from "@playwright/test";

test("exports the current matchup as a pdf", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("print-preview-button")).toBeVisible();
  await expect(page.getByTestId("pdf-export-button")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("pdf-export-button").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/-matchup\.pdf$/);
});
