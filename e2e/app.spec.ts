import { expect, test } from "@playwright/test";

test("generates a matchup and shows summary data", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("event-name-input").fill("E2Eテスト会");
  await page.getByTestId("participant-count-input").fill("5");
  await page.getByTestId("court-count-input").fill("1");
  await page.getByTestId("round-count-input").fill("5");

  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("result-summary")).toBeVisible();
  await expect(page.getByTestId("selected-seed")).not.toBeEmpty();
  await expect(page.getByTestId("round-card-1")).toBeVisible();
  await expect(page.getByTestId("round-card-5")).toBeVisible();
  await expect(page.getByText("E2Eテスト会")).toBeVisible();
  await expect(page.getByText("人ごとの集計")).toBeVisible();
});

test("re-tapping generate updates the selected seed", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("selected-seed")).toBeVisible();
  const firstSeed = await page.getByTestId("selected-seed").textContent();

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("selected-seed")).toBeVisible();

  await expect
    .poll(async () => page.getByTestId("selected-seed").textContent())
    .not.toBe(firstSeed);
});
