import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { once } from "node:events";
import { pathToFileURL } from "node:url";

test("Storage's gaxios can send multipart requests using the overridden UUID v4", { timeout: 10_000 }, async () => {
  // Resolve the actual Storage transport, not a separately installed direct dependency.
  const projectRequire = createRequire(import.meta.url);
  const storageRequire = createRequire(projectRequire.resolve("@google-cloud/storage"));
  const { Gaxios } = await import(pathToFileURL(storageRequire.resolve("gaxios")).href);
  const received = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received.push({ type: request.headers["content-type"], body: Buffer.concat(chunks).toString() });
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ accepted: true }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const transport = new Gaxios();
    for (let index = 0; index < 2; index++) {
      const result = await transport.request({
        url: `http://127.0.0.1:${server.address().port}/upload`,
        method: "POST",
        noProxy: ["127.0.0.1"],
        timeout: 5_000,
        retry: false,
        responseType: "json",
        multipart: [
          { headers: { "Content-Type": "application/json" }, content: JSON.stringify({ name: "sdk-check" }) },
          { headers: { "Content-Type": "text/plain" }, content: "local-smoke-payload" },
        ],
      });
      assert.equal(result.status, 200);
      assert.deepEqual(result.data, { accepted: true });
    }
    for (const request of received) {
      const match = /^multipart\/related; boundary=([0-9a-f-]{36})$/.exec(request.type);
      assert.ok(match, "The CommonJS UUID v4 must produce a multipart boundary");
      assert.match(match[1], /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.ok(request.body.includes(`--${match[1]}`));
      assert.ok(request.body.includes('"name":"sdk-check"'));
      assert.ok(request.body.includes("local-smoke-payload"));
    }
    assert.notEqual(received[0].type, received[1].type, "Each request gets a fresh boundary");
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
