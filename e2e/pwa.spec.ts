import { expect, test } from "@playwright/test";

test("keeps the app share action in the header without a standalone banner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("install-prompt-banner")).toHaveCount(0);
  await expect(page.getByTestId("open-share-dialog-button")).toBeVisible();
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
