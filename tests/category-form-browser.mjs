// Isolated regression against the real manager and dialog, with no auth bypass or DB writes.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import puppeteer from "puppeteer";

const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: "tsx", contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
    import Manager from "./client/src/components/menu-category-manager";
    const client=new QueryClient({defaultOptions:{queries:{retry:false,queryFn:async()=>[]}}});
    const empty=new URL(location.href).searchParams.has("empty");
    createRoot(document.getElementById("root")).render(
      <QueryClientProvider client={client}>
        <Manager pubId={999} categories={empty?[]:[{
          id:21,name:"Hot Dogs",description:"Wurstel di manzo Black Angus artigianali e una selezione di abbinamenti incredibili",
          infoBox:"Patate fritte incluse",isVisible:true,orderIndex:0,items:[]
        }]}/>
      </QueryClientProvider>);
  ` },
  bundle: true, write: false, jsx: "automatic", format: "iife",
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
});
const assets = await readdir("dist/public/assets");
const css = await readFile(`dist/public/assets/${assets.find(name => /^index-.*\.css$/.test(name))}`, "utf8");
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [], writes = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setRequestInterception(true);
  page.on("request", request => {
    if (request.method() !== "GET") {
      writes.push({ url: request.url(), body: JSON.parse(request.postData() || "{}") });
    }
    request.respond({
      status: 200, contentType: request.isNavigationRequest() ? "text/html" : "application/json",
      body: request.isNavigationRequest()
        ? '<html data-platform="ios"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root" style="padding:16px"></div></html>'
        : "{}",
    });
  });
  async function open(width, mode) {
    await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(`https://category.test/${mode === "empty" ? "?empty" : ""}`);
    await page.addStyleTag({ content: css + ":root{--frozen-sat:47px;--frozen-sab:34px}" });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const selector = mode === "edit" ? '[data-testid="button-edit-category-21"]'
      : mode === "empty" ? '[data-testid="menu-first-category-dialog"]' : '[data-testid="button-add-category"]';
    if (mode === "empty") {
      // The empty-state trigger sits outside its not-yet-mounted dialog.
      await page.waitForSelector('[data-testid="button-add-category"]');
      const buttons = await page.$$("button");
      for (const button of buttons) {
        if ((await button.evaluate(n => n.textContent)).includes("Crea Prima Categoria")) { await button.click(); break; }
      }
    } else {
      await page.waitForSelector(selector);
      await page.click(selector);
    }
    await page.waitForSelector('[role="dialog"]');
    await new Promise(r => setTimeout(r, 300));
  }
  async function assertFits() {
    const result = await page.$eval('[role="dialog"]', dialog => {
      const box = dialog.getBoundingClientRect();
      const controls = [...dialog.querySelectorAll('input,textarea,button,[role="switch"]')];
      return {
        left: box.left, right: box.right, overflow: dialog.scrollWidth > dialog.clientWidth + 1,
        clipped: controls.filter(node => {
          const r = node.getBoundingClientRect();
          return r.left < box.left - 1 || r.right > box.right + 1;
        }).map(n => n.getAttribute("data-testid") || n.tagName),
        nestedScrollers: [...dialog.querySelectorAll("*")].filter(node =>
          /auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1).length,
      };
    });
    if (result.left < 0 || result.right > page.viewport().width) {
      console.log(await page.$eval('[role="dialog"]', n => ({
        innerWidth, clientWidth: document.documentElement.clientWidth, visualWidth: visualViewport.width,
        parent: n.parentElement.getBoundingClientRect().toJSON(),
        computedWidth: getComputedStyle(n).width, parentStyle: n.parentElement.getAttribute("style"),
        dialogStyle: n.getAttribute("class"),
      })));
      await page.screenshot({ path: "/tmp/category-form-overflow.png" });
    }
    assert.ok(result.left >= 0 && result.right <= page.viewport().width, JSON.stringify({ ...result, viewport: page.viewport() }));
    assert.equal(result.overflow, false, JSON.stringify(result));
    assert.deepEqual(result.clipped, [], "no field or action may be cut off");
    assert.equal(result.nestedScrollers, 0, "the dialog is the only scroll owner");
  }
  async function editField(id) {
    const selector = `[data-testid="${id}"]`;
    const node = await page.$(selector);
    await node.evaluate(n => n.scrollIntoView({ block: "center" }));
    await node.click();
    await node.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    const before = await node.evaluate(n => n.value);
    await page.keyboard.type(" prova", { delay: 20 });
    assert.ok(await node.evaluate(n => n.isConnected && document.activeElement === n), `${id} must keep its original node and focus after typing`);
    assert.equal(await node.evaluate(n => n.value), `${before} prova`);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    assert.ok(await node.evaluate(n => n.isConnected && document.activeElement === n), `${id} must keep focus after deleting`);
    assert.equal(await node.evaluate(n => n.value), `${before} pro`);
    return `${before} pro`;
  }
  for (const width of [320, 390, 430, 1280]) {
    for (const mode of ["edit", "create", "empty"]) {
      await open(width, mode);
      await assertFits();
      const prefix = mode === "edit" ? "edit" : "create";
      const name = await editField(`input-${prefix}-category-name`);
      const description = await editField(`textarea-${prefix}-category-description`);
      const infoBox = await editField(`textarea-${prefix}-category-infobox`);
      // Editing another field must not erase an unsaved uncontrolled name.
      assert.equal(await page.$eval(`[data-testid="input-${prefix}-category-name"]`, n => n.value), name);
      const toggle = await page.$(`[data-testid="switch-${prefix}-category-visible"]`);
      await toggle.evaluate(n => n.scrollIntoView({ block: "center" }));
      await toggle.click();
      const expectedVisible = await toggle.evaluate(n => n.getAttribute("aria-checked") === "true");
      await assertFits();
      const save = await page.$(`[data-testid="button-save-${prefix}"]`);
      await save.evaluate(n => n.scrollIntoView({ block: "center" }));
      await new Promise(r => setTimeout(r, 100));
      const count = writes.length;
      await save.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
      assert.equal(writes.length, count + 1, "one submit only");
      assert.deepEqual(
        { name: writes.at(-1).body.name, description: writes.at(-1).body.description,
          infoBox: writes.at(-1).body.infoBox, isVisible: writes.at(-1).body.isVisible },
        { name: name.trim(), description: description.trim(), infoBox: infoBox.trim(), isVisible: expectedVisible },
      );
      console.log(`PASS ${width}px ${mode}: focus, deletion, field state, bounds, single scroll and save payload`);
    }
  }
  await open(390, "edit");
  await page.screenshot({ path: "/tmp/category-form-fixed.png" });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
