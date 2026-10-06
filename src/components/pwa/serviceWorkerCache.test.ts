import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const ORIGIN = "https://example.com";

type MockResponse = {
  ok: boolean;
  type: "basic";
  clone: () => MockResponse;
  text: () => Promise<string>;
};

type FetchEvent = {
  request: Request;
  respondWith: (promise: Promise<MockResponse>) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

type InstallEvent = {
  waitUntil: (promise: Promise<unknown>) => void;
};

type ListenerMap = {
  install?: (event: InstallEvent) => void;
  fetch?: (event: FetchEvent) => void;
};

function createResponse(body: string): MockResponse {
  return {
    ok: true,
    type: "basic",
    clone: () => createResponse(body),
    text: async () => body,
  };
}

class MemoryCache {
  private readonly responses = new Map<string, MockResponse>();

  async match(request: Request | string) {
    return this.responses.get(this.cacheKey(request))?.clone();
  }

  async put(request: Request | string, response: MockResponse) {
    this.responses.set(this.cacheKey(request), response.clone());
  }

  async addAll(urls: string[]) {
    urls.forEach((url) => {
      this.responses.set(this.cacheKey(url), createResponse(`precache:${url}`));
    });
  }

  has(url: string) {
    return this.responses.has(this.cacheKey(url));
  }

  private cacheKey(request: Request | string) {
    return typeof request === "string" ? new URL(request, ORIGIN).href : request.url;
  }
}

function loadServiceWorker() {
  const listeners: ListenerMap = {};
  const cache = new MemoryCache();
  const fetchMock = vi.fn(async () => createResponse("network"));
  const script = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");

  vm.runInNewContext(script, {
    self: {
      location: { origin: ORIGIN },
      addEventListener: <Name extends keyof ListenerMap>(name: Name, listener: ListenerMap[Name]) => {
        listeners[name] = listener;
      },
      skipWaiting: vi.fn(),
      clients: {
        claim: vi.fn(async () => undefined),
      },
    },
    caches: {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => ["tennis-matchup-static-v1"]),
      delete: vi.fn(async () => true),
    },
    fetch: fetchMock,
    URL,
  });

  return { listeners, cache, fetchMock };
}

async function dispatchFetch(listener: ListenerMap["fetch"], request: Request) {
  expect(listener).toBeDefined();

  let responsePromise: Promise<MockResponse> | undefined;
  const waitUntil = vi.fn();

  listener?.({
    request,
    respondWith: (promise) => {
      responsePromise = promise;
    },
    waitUntil,
  });

  expect(responsePromise).toBeDefined();

  return {
    response: await responsePromise!,
    waitUntil,
  };
}

describe("service worker static asset cache", () => {
  it("precaches versioned app icon URLs during install", async () => {
    const { listeners, cache } = loadServiceWorker();
    let installPromise: Promise<unknown> | undefined;

    listeners.install?.({
      waitUntil: (promise) => {
        installPromise = promise;
      },
    });

    expect(installPromise).toBeDefined();
    await installPromise;

    expect(cache.has("/icons/icon-192.png?iconv=transparent-v1")).toBe(true);
    expect(cache.has("/icons/icon-512.png?iconv=transparent-v1")).toBe(true);
  });

  it("serves cached app icons without network revalidation", async () => {
    const { listeners, cache, fetchMock } = loadServiceWorker();
    const iconRequest = new Request(`${ORIGIN}/icons/icon-192.png?iconv=transparent-v1`);
    await cache.put(iconRequest, createResponse("cached-icon"));

    const { response, waitUntil } = await dispatchFetch(listeners.fetch, iconRequest);

    expect(await response.text()).toBe("cached-icon");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it("keeps stale while revalidate behavior for non-icon static assets", async () => {
    const { listeners, cache, fetchMock } = loadServiceWorker();
    const brandRequest = new Request(`${ORIGIN}/brand/logo-bamboosato.webp?brandv=bamboosato-v1`);
    await cache.put(brandRequest, createResponse("cached-brand"));

    const { response, waitUntil } = await dispatchFetch(listeners.fetch, brandRequest);

    expect(await response.text()).toBe("cached-brand");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(waitUntil).toHaveBeenCalledOnce();
  });
});
