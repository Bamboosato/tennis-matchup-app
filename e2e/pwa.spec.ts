import { expect, test } from "@playwright/test";

test("shows install banner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("install-prompt-banner")).toBeVisible();
});

test("serves a valid web manifest", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.name).toBe("テニス対戦組合せApp");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: expect.stringMatching(/^\/icons\/icon-192\.png\?assetv=/),
      }),
      expect.objectContaining({
        src: expect.stringMatching(/^\/icons\/icon-512\.png\?assetv=/),
      }),
    ]),
  );
});
