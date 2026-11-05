import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import express from "express";
import helmet from "helmet";
import ts from "typescript";

test("Actual app Helmet configuration identifies the map's origin without weakening other headers", async () => {
  const path = "server/index.ts";
  const source = ts.createSourceFile(path, await readFile(path, "utf8"), ts.ScriptTarget.Latest, true);
  let options;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "helmet") {
      options = vm.runInNewContext(`(${node.arguments[0].getText(source)})`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(options, "Test must use the app's actual middleware configuration");
  const app = express();
  app.use(helmet(options));
  app.get("/", (_request, response) => response.send("map fixture"));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise(resolve => server.listening ? resolve() : server.once("listening", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.ok(response.headers.has("strict-transport-security"));
    assert.equal(response.headers.get("content-security-policy"), null);
    assert.equal(response.headers.get("cross-origin-embedder-policy"), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("Service worker invalidates old map tiles, not other application caches", async () => {
  const listeners = new Map();
  const removed = [];
  let names = [];
  const context = vm.createContext({
    self: {
      addEventListener: (event, listener) => listeners.set(event, listener),
      clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => names,
      delete: async name => { removed.push(name); return true; },
    },
    URL, Response, Request, Headers, console,
  });
  vm.runInContext(await readFile("client/public/sw.js", "utf8"), context);
  const current = vm.runInContext("({version:CACHE_VERSION, tile:TILE_CACHE, static:STATIC_CACHE, pages:PAGE_CACHE, images:IMAGE_CACHE, api:API_SAFE_CACHE})", context);
  const previousTiles = `fermenta-tiles-${current.version}`;
  names = [previousTiles, current.static, current.pages, current.images, current.api];
  assert.notEqual(current.tile, previousTiles);
  let activation;
  listeners.get("activate")({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(removed, [previousTiles]);
});
