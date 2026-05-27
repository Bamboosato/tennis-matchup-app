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

test("serves the service worker with update-safe headers", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/javascript");
  expect(response.headers()["cache-control"]).toContain("no-store");

  const serviceWorker = await response.text();
  expect(serviceWorker).toContain("/_next/static/");
  expect(serviceWorker).toContain("/brand/");
  expect(serviceWorker).toContain("/icons/");
  expect(serviceWorker).toContain("/fonts/");
  expect(serviceWorker).toContain('STATIC_CACHE_POLICY_VERSION = "v1"');
  expect(serviceWorker).not.toContain("tennis-matchup-static-v1.2.1");
});

test("caches static assets without caching API responses", async ({ page }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      return {
        supported: false,
        staticAssetCached: false,
        brandAssetCached: false,
        apiResponseCached: false,
        staticCacheName: null,
      };
    }

    const existingRegistration = await navigator.serviceWorker.getRegistration(
      "/",
    );
    await existingRegistration?.unregister();

    const existingCacheNames = await caches.keys();
    await Promise.all(
      existingCacheNames
        .filter((cacheName) => cacheName.startsWith("tennis-matchup-static-"))
        .map((cacheName) => caches.delete(cacheName)),
    );

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
      });
    }

    const staticUrl = `/icons/icon-192.png?sw-test=${Date.now()}`;
    const brandUrl = `/brand/logo-bamboosato.webp?sw-test=${Date.now()}`;
    await fetch(staticUrl);
    await fetch(brandUrl);
    await fetch("/api/v1/matchups/generate").catch(() => undefined);

    const cacheNames = await caches.keys();
    const staticCacheName = cacheNames.find((cacheName) =>
      cacheName.startsWith("tennis-matchup-static-"),
    );
    const staticCache = staticCacheName
      ? await caches.open(staticCacheName)
      : null;

    const staticAssetCached = Boolean(
      staticCache && (await staticCache.match(staticUrl)),
    );
    const brandAssetCached = Boolean(
      staticCache && (await staticCache.match(brandUrl)),
    );
    const apiResponseCached = Boolean(
      staticCache && (await staticCache.match("/api/v1/matchups/generate")),
    );

    await registration.unregister();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("tennis-matchup-static-"))
        .map((cacheName) => caches.delete(cacheName)),
    );

    return {
      supported: true,
      staticAssetCached,
      brandAssetCached,
      apiResponseCached,
      staticCacheName,
    };
  });

  expect(result.supported).toBe(true);
  expect(result.staticAssetCached).toBe(true);
  expect(result.brandAssetCached).toBe(true);
  expect(result.apiResponseCached).toBe(false);
  expect(result.staticCacheName).toContain("tennis-matchup-static-");
});

test("does not show the PWA splash screen in a normal browser tab", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("pwa-splash-screen")).toHaveCount(0);
});

test("shows the PWA splash screen only once in standalone display mode", async ({ page }) => {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);

    window.matchMedia = (query: string) => {
      if (query !== "(display-mode: standalone)") {
        return originalMatchMedia(query);
      }

      return {
        matches: true,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    };
  });

  await page.goto("/");

  await expect(page.getByTestId("pwa-splash-screen")).toBeVisible();
  await expect(page.getByTestId("pwa-splash-logo")).toHaveAttribute(
    "src",
    /\/brand\/logo-bamboosato\.webp\?brandv=bamboosato-v1/,
  );
  await expect(page.getByTestId("pwa-splash-screen")).toHaveCount(0, {
    timeout: 3000,
  });

  await page.reload();
  await expect(page.getByTestId("pwa-splash-screen")).toHaveCount(0);
});

test("keeps app icon URLs stable across app asset version updates", async ({ page }) => {
  await page.goto("/");

  const headerIconSrc = await page.getByTestId("app-header").locator("img").getAttribute("src");
  const iconHrefs = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLLinkElement).href),
    );

  expect(headerIconSrc).toContain("/icons/icon-192.png?iconv=transparent-v1");
  expect(headerIconSrc).not.toContain("assetv=");
  expect(iconHrefs.length).toBeGreaterThan(0);
  expect(iconHrefs.every((href) => !href.includes("assetv="))).toBe(true);
});
