// Real manager components, isolated fixture APIs. Never writes to the app DB.
// Run after npm run build: node tests/owner-inventory-browser.mjs
import assert from "node:assert/strict";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const bundled = await build({
  stdin: {
    resolveDir: root,
    loader: "tsx",
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
      import Menu from "./client/src/components/menu-category-manager";
      import { TapListManager } from "./client/src/components/taplist-manager";
      import { BottleListManager } from "./client/src/components/bottle-list-manager";
      const beer = id => ({ id, name: "Birra artigianale " + id, style: "India Pale Ale", abv: "6.5", brewery: {id: 1, name: "Birrificio dal nome molto lungo"} });
      const products = [1,2,3].map(id => ({id, name: "Prodotto artigianale " + id, description: "Descrizione del prodotto con dettagli e ingredienti.", price: "8.00", isVisible: true, orderIndex: id - 1}));
      const categories = [10,20].map(id => ({id, name: "Categoria " + id, isVisible: true, orderIndex: id/10 - 1, items: id === 10 ? products : []}));
      const taps = [1,2,3].map(id => ({id, beer: beer(id), tapNumber: id, isVisible: true, prices: [{size:"33cl",price:"5.00"}]}));
      const bottles = [1,2,3].map(id => ({id, beer: beer(id), orderIndex: id - 1, isVisible: true, price: "7.00", size: "33cl", quantity: 3}));
      window.requests = [];
      window.failNextReorder = false;
      window.fetch = async (url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : null;
        window.requests.push({url: String(url), method: options.method || "GET", body});
        if (String(url).endsWith("/reorder") && window.failNextReorder) {
          window.failNextReorder = false;
          return new Response(JSON.stringify({message:"Test failure"}), {status:500, headers:{"content-type":"application/json"}});
        }
        return new Response(JSON.stringify(!options.method || options.method === "GET" ? [] : {ok:true}), {status:200, headers:{"content-type":"application/json"}});
      };
      const client = new QueryClient({ defaultOptions: {queries:{retry:false, queryFn:async()=>[]}, mutations:{retry:false}} });
      function App() {
        const mode = new URLSearchParams(location.search).get("mode") || "menu";
        return <QueryClientProvider client={client}><main className="p-3">
          {mode === "menu" ? <Menu pubId={999} categories={categories} /> : mode === "tap" ? <TapListManager pubId={999} tapList={taps} /> : <BottleListManager pubId={999} bottleList={bottles} />}
        </main></QueryClientProvider>;
      }
      createRoot(document.getElementById("root")).render(<App />);
    `,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
});
const assets = await readdir(`${root}/dist/public/assets`);
await writeFile("/tmp/owner-inventory-browser-bundle.js", bundled.outputFiles[0].text);
const styles = await Promise.all(assets.filter(name => name.endsWith(".css")).map(name => readFile(`${root}/dist/public/assets/${name}`, "utf8")));
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which", ["chromium"], {encoding:"utf8"}).trim();
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", error => {
    errors.push(error.message);
    console.error("Browser error:", error.stack);
  });
  await page.setRequestInterception(true);
  page.on("request", request => {
    if (request.isNavigationRequest()) request.respond({status:200, contentType:"text/html", body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>'});
    else request.abort();
  });
  const load = async (mode, width) => {
    await page.setViewport({width, height:900, isMobile:true, hasTouch:true, deviceScaleFactor:1});
    await page.goto(`http://inventory.test/?mode=${mode}`);
    await page.addStyleTag({content:styles.join("\n")});
    await page.addScriptTag({content:bundled.outputFiles[0].text});
    await page.waitForSelector("[data-touch-sort-idx]");
    await new Promise(resolve => setTimeout(resolve, 450));
  };
  const touchMove = async (source, target) => {
    await page.evaluate(({source, target}) => {
      const from = document.querySelector(source);
      const to = document.querySelector(target);
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const start = new Touch({identifier:1, target:from, clientX:a.x+a.width/2, clientY:a.y+a.height/2});
      const end = new Touch({identifier:1, target:from, clientX:b.x+b.width/2, clientY:b.y+Math.min(30,b.height/2)});
      from.dispatchEvent(new TouchEvent("touchstart", {bubbles:true, cancelable:true, touches:[start], changedTouches:[start]}));
      document.dispatchEvent(new TouchEvent("touchmove", {bubbles:true, cancelable:true, touches:[end], changedTouches:[end]}));
      document.dispatchEvent(new TouchEvent("touchend", {bubbles:true, cancelable:true, touches:[], changedTouches:[end]}));
    }, {source,target});
  };
  for (const width of (process.env.TEST_ONLY ? [] : [320,360,375,390,412])) {
    await load("menu", width);
    await page.evaluate(() => [...document.querySelectorAll("button")].find(button => button.textContent.includes("3 prodotti"))?.click());
    await page.waitForSelector('[data-touch-sort-group="10"]');
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Menu overflow at ${width}px`);
    assert.equal(await page.$eval('[data-testid="product-actions-1"]', el => el.getBoundingClientRect().width > 200), true);
    const sizes = await page.$$eval('[data-testid="product-actions-1"] button', buttons => buttons.map(button => button.getBoundingClientRect().height));
    assert.ok(sizes.every(height => height >= 44));
    await touchMove('button[aria-label="Riordina Prodotto artigianale 1"]', '[data-touch-sort-group="10"][data-touch-sort-idx="1"]');
    await page.waitForFunction(() => window.requests.some(request => request.url.endsWith("/items/reorder")));
    const order = await page.evaluate(() => window.requests.find(request => request.url.endsWith("/items/reorder")).body.order);
    assert.deepEqual(order, [{id:2,orderIndex:0},{id:1,orderIndex:1},{id:3,orderIndex:2}]);
    assert.equal(await page.$eval('[data-touch-sort-group="10"]', el => el.textContent.includes("Prodotto artigianale 2")), true);
    assert.equal(await page.evaluate(() => document.querySelectorAll('[style*="z-index: 99999"]').length), 0);
    console.log(`PASS menu ${width}px: touch order, numbering, 44px actions, no overflow`);
  }
  for (const mode of ["tap","bottle"]) {
    await load(mode,390);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await touchMove('[aria-label="Riordina Birra artigianale 1"]', '[data-touch-sort-idx="1"]');
    await page.waitForFunction(() => window.requests.some(request => request.url.endsWith("/reorder")));
    const order = await page.evaluate(() => window.requests.find(request => request.url.endsWith("/reorder")).body.order);
    assert.deepEqual(order.map(item => item.id), [2,1,3]);
    assert.deepEqual(order.map(item => mode === "tap" ? item.tapNumber : item.orderIndex), mode === "tap" ? [1,2,3] : [0,1,2]);
    if (mode === "tap") assert.match(await page.$eval('[data-touch-sort-idx="0"]', el => el.textContent), /Spina 1/);
    console.log(`PASS ${mode}: touch reorder and immediate order`);
  }
  await load("menu",390);
  await touchMove('button[aria-label="Riordina categoria Categoria 10"]', '[data-touch-sort-idx="1"]');
  await page.waitForFunction(() => window.requests.some(request => request.url.endsWith("/menu-categories/reorder")));
  assert.deepEqual(await page.evaluate(() => window.requests.find(request => request.url.endsWith("/menu-categories/reorder")).body.order), [{id:20,orderIndex:0},{id:10,orderIndex:1}]);
  console.log("PASS category: touch reorder");
  await load("menu",390);
  await page.evaluate(() => [...document.querySelectorAll("button")].find(button => button.textContent.includes("3 prodotti"))?.click());
  await new Promise(resolve => setTimeout(resolve, 400));
  await page.evaluate(() => { window.failNextReorder = true; });
  await touchMove('button[aria-label="Riordina Prodotto artigianale 1"]', '[data-touch-sort-group="10"][data-touch-sort-idx="1"]');
  await page.waitForFunction(() => window.requests.some(request => request.url.endsWith("/items/reorder")));
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.match(await page.$eval('[data-touch-sort-group="10"]', el => el.textContent), /Prodotto artigianale 1/);
  console.log("PASS failed save: restores original product order");
  await load("menu",390);
  await page.evaluate(() => [...document.querySelectorAll("button")].find(button => button.textContent.includes("3 prodotti"))?.click());
  await new Promise(resolve => setTimeout(resolve, 400));
  await page.evaluate(() => {
    const handle = document.querySelector('button[aria-label="Riordina Prodotto artigianale 1"]');
    const target = document.querySelector('[data-touch-sort-group="10"][data-touch-sort-idx="1"]');
    const transfer = new DataTransfer();
    handle.dispatchEvent(new DragEvent("dragstart", {bubbles:true, cancelable:true, dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent("dragover", {bubbles:true, cancelable:true, dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent("drop", {bubbles:true, cancelable:true, dataTransfer:transfer}));
    handle.dispatchEvent(new DragEvent("dragend", {bubbles:true, dataTransfer:transfer}));
  });
  await page.waitForFunction(() => window.requests.some(request => request.url.endsWith("/items/reorder")));
  assert.deepEqual(await page.evaluate(() => window.requests.find(request => request.url.endsWith("/items/reorder")).body.order), [{id:2,orderIndex:0},{id:1,orderIndex:1},{id:3,orderIndex:2}]);
  assert.equal(await page.evaluate(() => window.requests.filter(request => request.url.endsWith("/menu-categories/reorder")).length), 0);
  console.log("PASS desktop: product drag does not reorder its category");
  await page.screenshot({path:"/tmp/owner-menu-mobile.png"});
  assert.deepEqual(errors, [], "Browser runtime errors");
} finally {
  await browser.close();
}
