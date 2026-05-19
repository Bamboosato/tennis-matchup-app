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

  await expect(page.getByText("ラウンド数")).toBeVisible();
  await page.getByTestId("event-name-input").fill("E2Eテスト会");
  await page.getByTestId("participant-count-input").fill("5");
  await page.getByTestId("court-count-input").fill("1");
  await page.getByTestId("round-count-input").fill("5");

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("generate-button")).toContainText("作成中...");

  await expect(page.getByTestId("result-summary")).toBeVisible();
  await expect(page.getByTestId("generation-complete-message")).toContainText(
    "作成/再作成が完了しました。",
  );
  await expect(page.getByTestId("generation-complete-message")).toHaveCount(0, {
    timeout: 5_000,
  });
  await expect(page.getByTestId("selected-seed")).not.toBeEmpty();
  await expect(page.getByTestId("round-card-1")).toBeVisible();
  await expect(page.getByTestId("round-card-5")).toBeVisible();
  await expect(page.getByText("E2Eテスト会")).toBeVisible();
  await expect(page.getByTestId("continuation-panel-toggle")).toContainText(
    "ラウンド・参加者途中変更",
  );
  await expect(page.getByTestId("continuation-panel-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByTestId("continuation-panel-body")).toHaveCount(0);
  const continuationPanelBox = await page.getByTestId("continuation-panel").boundingBox();
  const playerStatsToggleBox = await page.getByTestId("player-stats-toggle").boundingBox();
  expect(continuationPanelBox?.y).toBeLessThan(playerStatsToggleBox?.y ?? 0);
  await expect(page.getByTestId("player-stats-toggle")).toContainText("参加者別サマリー");
  await expect(page.getByTestId("player-stats-panel")).toHaveCount(0);

  await page.getByTestId("player-stats-toggle").click();
  await expect(page.getByTestId("player-stats-panel")).toBeVisible();
  await expect(page.getByText("人ごとの集計")).toHaveCount(0);
  await expect(page.getByTestId("player-stats-panel")).toContainText("総合スコア");
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

test("confirms and applies court count adjustment before generation", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("participant-count-input").fill("7");
  await page.getByTestId("court-count-input").fill("2");
  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("court-count-adjustment-dialog")).toBeVisible();
  await expect(page.getByTestId("court-count-adjustment-dialog")).toContainText(
    "コート数を調整します",
  );
  await expect(page.getByTestId("court-count-adjustment-dialog")).toContainText(
    "コート数：1面",
  );

  await page.getByTestId("court-adjustment-confirm-button").click();

  await expect(page.getByTestId("court-count-adjustment-dialog")).toHaveCount(0);
  await expect(page.getByTestId("court-count-input")).toHaveValue("1");
  await expect(page.getByTestId("result-summary")).toBeVisible();
  await expect(page.getByTestId("generation-complete-message")).toContainText(
    "作成/再作成が完了しました。",
  );
  await expect(page.getByTestId("round-card-1")).toContainText("Court 1");
  await expect(page.getByTestId("round-card-1")).not.toContainText("Court 2");
});

test("cancels court count adjustment without generating", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("participant-count-input").fill("7");
  await page.getByTestId("court-count-input").fill("2");
  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("court-count-adjustment-dialog")).toBeVisible();
  await page.getByTestId("court-adjustment-cancel-button").click();

  await expect(page.getByTestId("court-count-adjustment-dialog")).toHaveCount(0);
  await expect(page.getByTestId("court-count-input")).toHaveValue("2");
  await expect(page.getByTestId("result-summary")).toHaveCount(0);
});

test("stepper controls update count conditions before generation", async ({ page }) => {
  await page.goto("/");

  for (let count = 0; count < 4; count += 1) {
    await page.getByTestId("participant-count-increment").click();
  }
  await page.getByTestId("court-count-increment").click();
  await page.getByTestId("round-count-increment").click();

  await expect(page.getByTestId("participant-count-input")).toHaveValue("12");
  await expect(page.getByTestId("court-count-input")).toHaveValue("3");
  await expect(page.getByTestId("round-count-input")).toHaveValue("5");
  await expect(page.getByTestId("summary-usable-courts")).toHaveText("3 面");
  await expect(page.getByTestId("summary-active-players")).toHaveText("12 人");
  await expect(page.getByTestId("summary-rest-players")).toHaveText("0 人");

  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("round-card-5")).toBeVisible();
  await expect(page.getByTestId("round-card-1")).toContainText("Court 3");
});

test("stepper controls respect minimums and gender mode disabled states", async ({ page }) => {
  await page.goto("/");

  for (let count = 0; count < 4; count += 1) {
    await page.getByTestId("participant-count-decrement").click();
  }
  await page.getByTestId("court-count-decrement").click();
  for (let count = 0; count < 3; count += 1) {
    await page.getByTestId("round-count-decrement").click();
  }

  await expect(page.getByTestId("participant-count-input")).toHaveValue("4");
  await expect(page.getByTestId("participant-count-decrement")).toBeDisabled();
  await expect(page.getByTestId("court-count-input")).toHaveValue("1");
  await expect(page.getByTestId("court-count-decrement")).toBeDisabled();
  await expect(page.getByTestId("round-count-input")).toHaveValue("1");
  await expect(page.getByTestId("round-count-decrement")).toBeDisabled();
  await expect(page.getByTestId("female-count-increment")).toBeDisabled();
  await expect(page.getByTestId("male-count-increment")).toBeDisabled();

  await page.getByRole("button", { name: "混合対決優先" }).click();
  await expect(page.getByTestId("female-count-increment")).toBeEnabled();
  await expect(page.getByTestId("male-count-increment")).toBeEnabled();
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
  await expect(page.getByTestId("round-complete-checkbox-2")).toBeDisabled();

  const roundOneCheckbox = page.getByTestId("round-complete-checkbox-1");
  await roundOneCheckbox.check();
  await expect(roundOneCheckbox).toBeChecked();
  await expect(page.getByTestId("round-card-1")).toHaveAttribute("data-completed", "true");
  await expect(page.getByTestId("round-complete-badge-1")).toBeVisible();
  await expect(page.getByTestId("round-complete-checkbox-2")).toBeEnabled();

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

test("continuation regenerate keeps completed rounds and disables result sharing", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("participant-count-input").fill("8");
  await page.getByTestId("court-count-input").fill("2");
  await page.getByTestId("round-count-input").fill("4");
  await expect(page.getByTestId("generate-button")).toBeEnabled();
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("round-card-4")).toBeVisible();

  await page.getByTestId("round-complete-checkbox-1").check();
  await page.getByTestId("round-complete-checkbox-2").check();
  const roundOneText = await page.getByTestId("round-card-1").innerText();
  await expect(page.getByText("ラウンド・参加者途中変更")).toBeVisible();
  await expect(page.getByTestId("continuation-panel-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByTestId("continuation-panel-body")).toHaveCount(0);
  await page.getByTestId("continuation-panel-toggle").click();
  await expect(page.getByTestId("continuation-panel-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.getByTestId("continuation-panel-body")).toBeVisible();
  await expect(page.getByTestId("continuation-share-attention")).toContainText(
    "⚠ 共有リンクは再生成後に無効になります。",
  );
  await expect(page.getByTestId("continuation-completed-range")).toHaveCount(0);
  await expect(page.getByTestId("continuation-current-round")).toHaveCount(0);
  await expect(page.getByTestId("continuation-target-rounds")).toHaveCount(0);
  await expect(page.getByTestId("continuation-notice-details-toggle")).toContainText(
    "▼ 詳細",
  );
  await expect(page.getByTestId("continuation-notice-details")).toHaveCount(0);
  await page.getByTestId("continuation-notice-details-toggle").click();
  await expect(page.getByTestId("continuation-notice-details-toggle")).toContainText(
    "▲ 詳細",
  );
  await expect(page.getByTestId("continuation-notice-details")).toContainText(
    "・事前に終了ラウンドは実施済み☑に変更",
  );
  await expect(page.getByTestId("continuation-notice-details")).toContainText(
    "・人数変更は未実施のラウンドにのみ反映",
  );
  await expect(page.getByTestId("continuation-notice-details")).toContainText(
    "・初回作成時の対戦モード・人数を基準に再作成",
  );
  await expect
    .poll(async () => page.getByTestId("continuation-notice-details").innerText())
    .toBe(
      [
        "・事前に終了ラウンドは実施済み☑に変更",
        "・人数変更は未実施のラウンドにのみ反映",
        "・初回作成時の対戦モード・人数を基準に再作成",
      ].join("\n"),
    );
  await expect(page.getByText("退出者の番号")).toBeVisible();
  const continuationPanelBodyText = await page.getByTestId("continuation-panel-body").innerText();
  expect(continuationPanelBodyText.indexOf("追加人数")).toBeGreaterThan(-1);
  expect(continuationPanelBodyText.indexOf("退出者の番号")).toBeGreaterThan(-1);
  expect(continuationPanelBodyText.indexOf("追加人数")).toBeLessThan(
    continuationPanelBodyText.indexOf("退出者の番号"),
  );

  const printButtonClass = await page.getByTestId("print-preview-button").getAttribute("class");
  const pdfButtonClass = await page.getByTestId("pdf-export-button").getAttribute("class");
  expect(printButtonClass ?? "").toContain("bg-white");
  expect(pdfButtonClass ?? "").toContain("bg-[var(--color-accent)]");

  await page.getByTestId("continuation-additional-round-count-increment").click();
  await expect(page.getByTestId("continuation-additional-round-count-input")).toHaveValue("1");
  await page.getByTestId("withdraw-participant-player-03").click();
  await page.getByTestId("continuation-add-count-input").fill("23");
  await expect(page.getByTestId("continuation-disabled-reason")).toContainText(
    "参加者は総計30人以下にしてください。",
  );
  await page.getByTestId("continuation-add-count-input").fill("1");
  await page.getByTestId("continuation-add-count-increment").click();
  await expect(page.getByTestId("continuation-next-eligible-count")).toContainText(
    "変更後の参加人数：8人 → 9人",
  );
  await page.getByTestId("continuation-add-count-decrement").click();
  await expect(page.getByTestId("continuation-next-eligible-count")).toContainText(
    "変更後の参加人数：8人 → 8人",
  );

  await page.getByTestId("continuation-submit-button").click();
  await expect(page.getByTestId("generation-complete-message")).toContainText(
    "作成/再作成が完了しました。",
  );
  await expect(page.getByTestId("open-result-share-button")).toBeDisabled();
  await expect(page.getByTestId("result-share-disabled-reason")).toHaveCount(0);
  await page.getByTestId("open-result-share-button").hover();
  await expect(
    page.getByRole("tooltip", { name: "途中再作成結果は共有URL未対応です。" }),
  ).toBeVisible();
  await expect(page.getByTestId("round-complete-checkbox-2")).toBeDisabled();
  await expect(page.getByTestId("round-complete-checkbox-3")).toBeEnabled();

  expect(await page.getByTestId("round-card-1").innerText()).toBe(roundOneText);
  await expect(page.getByTestId("round-card-3")).not.toContainText("03");
  await expect(page.getByTestId("round-card-4")).not.toContainText("03");
  await expect(page.getByTestId("round-card-5")).not.toContainText("03");
  await expect(page.getByTestId("round-card-3")).toContainText("09");
  await expect(page.getByTestId("round-card-4")).toContainText("09");
  await expect(page.getByTestId("round-card-5")).toContainText("09");
  await expect(page.getByTestId("continuation-withdrawn-summary")).toContainText("なし");
  await expect(page.getByTestId("withdraw-participant-player-03")).toBeDisabled();
  await expect(page.getByTestId("withdraw-participant-player-09")).toBeEnabled();
  await expect(page.getByTestId("continuation-additional-round-count-input")).toHaveValue("0");
  await expect(page.getByTestId("continuation-add-count-input")).toHaveValue("0");

  await page.getByTestId("round-complete-checkbox-3").check();
  await expect(page.getByTestId("round-complete-checkbox-3")).toBeEnabled();
  await page.getByTestId("round-complete-checkbox-3").uncheck();
  await expect(page.getByTestId("round-complete-checkbox-3")).not.toBeChecked();
});

test("continuation panel guides users to add rounds after all rounds are completed", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByTestId("round-count-input").fill("2");
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("round-card-2")).toBeVisible();

  await page.getByTestId("round-complete-checkbox-1").check();
  await page.getByTestId("round-complete-checkbox-2").check();

  await page.getByTestId("continuation-panel-toggle").click();
  await expect(page.getByTestId("continuation-disabled-reason")).toContainText(
    "全ラウンド実施済みです。追加ラウンドを指定して再作成してください。",
  );

  await page.getByTestId("continuation-additional-round-count-increment").click();
  await expect(page.getByTestId("continuation-disabled-reason")).toHaveCount(0);
  await expect(page.getByTestId("continuation-submit-button")).toContainText(
    "Round 3以降を再作成",
  );
});
