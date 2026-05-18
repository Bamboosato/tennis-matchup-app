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
  await expect(printPage.getByText("A4 印刷プレビュー。問題なければ印刷を実行してください。")).toBeVisible();
  await expect(printPage.getByTestId("print-share-qr-section")).toBeVisible();
  await expect(printPage.getByTestId("print-share-qr-image")).toBeVisible();
});

test("hides print QR for continuation results", async ({ page, context }) => {
  await page.goto("/");
  await page.getByTestId("participant-count-input").fill("8");
  await page.getByTestId("court-count-input").fill("2");
  await page.getByTestId("round-count-input").fill("4");
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("round-card-4")).toBeVisible();

  await page.getByTestId("round-complete-checkbox-1").check();
  await page.getByTestId("round-complete-checkbox-2").check();
  await page.getByTestId("withdraw-participant-player-03").click();
  await page.getByTestId("continuation-add-count-increment").click();
  await page.getByTestId("continuation-submit-button").click();
  await expect(page.getByTestId("open-result-share-button")).toBeDisabled();

  const printPagePromise = context.waitForEvent("page");
  await page.getByTestId("print-preview-button").click();
  const printPage = await printPagePromise;
  await printPage.waitForLoadState();

  await expect(printPage.getByTestId("print-page")).toBeVisible();
  await expect(printPage.getByTestId("print-share-qr-section")).toHaveCount(0);
});
