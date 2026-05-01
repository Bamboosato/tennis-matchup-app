import { expect, test } from "@playwright/test";

test("shows tooltip on hover for primary actions on desktop", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("generate-button").hover();
  await expect(
    page.getByRole("tooltip", { name: "入力した条件で組合せを作成または再作成します。" }),
  ).toBeVisible();

  await page.getByTestId("open-share-dialog-button").hover();
  await expect(
    page.getByRole("tooltip", { name: "アプリURLを共有、コピー、QRコード表示できます。" }),
  ).toBeVisible();
});

test("opens share dialog and shows QR code", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("open-share-dialog-button").click();
  await expect(page.getByTestId("app-share-dialog")).toBeVisible();
  await expect(page.getByText("https://tennis-matchup-app.vercel.app/")).toBeVisible();
  await expect(page.getByTestId("native-share-button")).toBeVisible();
  await expect(page.getByTestId("copy-url-button")).toBeVisible();

  await page.getByTestId("toggle-qr-button").click();
  await expect(page.getByTestId("share-qr-panel")).toBeVisible();
  await expect(page.getByTestId("share-qr-image")).toBeVisible();
});

test("generates a matchup and shows summary data", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("event-name-input").fill("E2Eテスト会");
  await page.getByTestId("participant-count-input").fill("5");
  await page.getByTestId("court-count-input").fill("1");
  await page.getByTestId("round-count-input").fill("5");

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("generate-button")).toContainText("作成中...");

  await expect(page.getByTestId("result-summary")).toBeVisible();
  await expect(page.getByTestId("selected-seed")).not.toBeEmpty();
  await expect(page.getByTestId("round-card-1")).toBeVisible();
  await expect(page.getByTestId("round-card-5")).toBeVisible();
  await expect(page.getByText("E2Eテスト会")).toBeVisible();
  await expect(page.getByText("人ごとの集計")).toBeVisible();
});

test("uses the latest typed conditions without requiring blur before generation", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("participant-count-input").fill("19");
  await page.getByTestId("court-count-input").fill("4");
  await page.getByTestId("round-count-input").fill("12");

  await expect(page.getByTestId("summary-usable-courts")).toHaveText("4 面");
  await expect(page.getByTestId("summary-active-players")).toHaveText("16 人");
  await expect(page.getByTestId("summary-rest-players")).toHaveText("3 人");

  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("round-card-12")).toBeVisible();
  await expect(page.getByTestId("round-card-1")).toContainText("Court 4");
});

test("enables gender counts only for gender-aware modes and shows compact gender labels", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("female-count-input")).toBeDisabled();
  await expect(page.getByTestId("male-count-input")).toBeDisabled();
  await expect(page.getByTestId("auto-numbering-breakdown")).toContainText("01～08：参加者");

  await page.getByRole("button", { name: "混合対決優先" }).click();
  await expect(page.getByTestId("female-count-input")).toBeEnabled();
  await expect(page.getByTestId("male-count-input")).toBeEnabled();

  await page.getByTestId("participant-count-input").fill("8");
  await page.getByTestId("female-count-input").fill("4");
  await page.getByTestId("male-count-input").fill("4");
  await expect(page.getByTestId("auto-numbering-breakdown")).toContainText(
    "01～04：女性、05～08：男性",
  );
  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("result-summary")).toBeVisible();
  await expect(page.getByTestId("round-card-1")).toContainText("01F");
  await expect(page.getByTestId("round-card-1")).toContainText("05M");

  await page.getByRole("button", { name: "通常" }).click();
  await expect(page.getByTestId("female-count-input")).toBeDisabled();
  await expect(page.getByTestId("male-count-input")).toBeDisabled();
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

test("completed round toggle can be switched and resets after regenerate", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("round-card-1")).toHaveAttribute("data-completed", "false");
  await expect(page.getByTestId("round-complete-badge-1")).toHaveCount(0);

  const roundOneCheckbox = page.getByTestId("round-complete-checkbox-1");
  await roundOneCheckbox.check();
  await expect(roundOneCheckbox).toBeChecked();
  await expect(page.getByTestId("round-card-1")).toHaveAttribute("data-completed", "true");
  await expect(page.getByTestId("round-complete-badge-1")).toBeVisible();

  await roundOneCheckbox.uncheck();
  await expect(roundOneCheckbox).not.toBeChecked();
  await expect(page.getByTestId("round-card-1")).toHaveAttribute("data-completed", "false");
  await expect(page.getByTestId("round-complete-badge-1")).toHaveCount(0);

  await roundOneCheckbox.check();
  await expect(roundOneCheckbox).toBeChecked();

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("selected-seed")).toBeVisible();
  await expect(page.getByTestId("round-card-1")).toHaveAttribute("data-completed", "false");
  await expect(page.getByTestId("round-complete-checkbox-1")).not.toBeChecked();
  await expect(page.getByTestId("round-complete-badge-1")).toHaveCount(0);
});
