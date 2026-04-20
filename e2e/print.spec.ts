import { expect, test } from "@playwright/test";

test("opens print preview in a new page", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("print-preview-button")).toBeVisible();

  const printPagePromise = context.waitForEvent("page");
  await page.getByTestId("print-preview-button").click();
  const printPage = await printPagePromise;
  await printPage.waitForLoadState();

  await expect(printPage.getByTestId("print-page")).toBeVisible();
  await expect(printPage.getByTestId("print-execute-button")).toBeVisible();
  await expect(printPage.getByText("Print Preview")).toBeVisible();
});
