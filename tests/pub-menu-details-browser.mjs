import { build } from "esbuild";
import puppeteer from "puppeteer";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

// Real components with isolated data: no database writes or sign-in bypass.
const bundle = await build({
  stdin: { loader: "tsx", resolveDir: process.cwd(), contents: `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
    import Drinks from "./client/src/components/pub/DrinksPublicSection";
    import Taps from "./client/src/components/pub/TaplistSection";
    import Bottles from "./client/src/components/pub/BottlesSection";
    window.detailRequests=0;window.actions={favorite:0,checkin:0};
    const description="<p>Prima riga completa</p><p>"+("Dettaglio aromatico e provenienza. ".repeat(80))+"FINE DESCRIZIONE</p>";
    const client=new QueryClient({defaultOptions:{queries:{retry:false,queryFn:async()=>{
      window.detailRequests++;
      if(new URL(location.href).searchParams.has("error")) throw new Error("Unavailable");
      return {id:101,name:"Birra prova",description,ibu:44,brewery:{name:"Birrificio prova"}};
    }}}});
    const wine={id:1,name:"Vino prova",producer:"Cantina prova",vintage:"2024",description,priceByGlass:"5.50",priceByBottle:"25",volumeCl:75,alcoholDegree:"13.5"};
    const beer={id:101,name:"Birra prova",style:"IPA",abv:"6",brewery:{name:"Birrificio prova"}};
    const embedded={...beer,id:102,name:"Birra in cantina",description};
    const legacy=new URL(location.href).searchParams.has("legacy");
    createRoot(document.getElementById("root")).render(<QueryClientProvider client={client}><main style={{padding:16,maxWidth:760,margin:"auto"}}>
      <Drinks categories={legacy?[]:[
        {id:1,name:"Rossi",type:"vino",items:[wine,{...wine,id:8,name:"Vino nascosto",isVisible:false}]},
        {id:2,name:"Analcolici",type:"bibita",items:[{id:2,name:"Aranciata",price:"3"}]},
        {id:3,name:"Nascosta",type:"vino",isVisible:false,items:[wine]}
      ]} legacyItems={legacy?[{...wine,category:"vino"},{id:2,name:"Aranciata",category:"bibita",price:"3"}]:[]}/>
      <Taps taps={[{id:11,beer,prices:[{size:"30 cl",price:"5"}]},{id:12,beer:{...beer,id:103},isActive:false}]}
        onToggleFavorite={()=>window.actions.favorite++} onCheckin={()=>window.actions.checkin++} currentUserCanCheckin/>
      <Bottles bottles={[{id:21,beer:embedded,format:"bottiglia",size:"33 cl",price:"7"}]}
        onToggleFavorite={()=>window.actions.favorite++}/>
    </main></QueryClientProvider>);
  ` },
  bundle: true, write: false, jsx: "automatic", format: "iife",
  define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
});
const assets = await readdir("dist/public/assets");
const css = await readFile(`dist/public/assets/${assets.find(name => /^index-.*\.css$/.test(name))}`, "utf8");
const browser = await puppeteer.launch({
  headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.stack); });
  await page.setRequestInterception(true);
  page.on("request", request => request.respond({
    status: 200, contentType: request.isNavigationRequest() ? "text/html" : "application/json",
    body: request.isNavigationRequest() ? '<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div></html>' : "{}",
  }));
  async function load(width, query = "") {
    await page.setViewport({ width, height: 844, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(`http://menu.test/${query}`);
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForSelector('[data-testid="beer-detail-trigger-101"]');
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  async function click(testId) {
    await page.$eval(`[data-testid="${testId}"]`, node => node.scrollIntoView({ block: "center" }));
    await page.click(`[data-testid="${testId}"]`);
  }
  async function close() {
    await page.click('[role="dialog"] button[aria-label="Chiudi finestra di dialogo"]');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  async function verifyDialog(kind) {
    await page.waitForSelector(`[data-testid="${kind}-detail-dialog"]`);
    await page.waitForFunction(kind => document.querySelector(`[data-testid="${kind}-detail-description"]`)?.textContent.includes("FINE DESCRIZIONE"), {}, kind);
    await new Promise(resolve => setTimeout(resolve, 250));
    const metrics = await page.$eval('[role="dialog"]', node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, x: box.x, right: box.right, text: node.textContent,
        overflow: node.scrollWidth > node.clientWidth + 1,
        innerScrollers: [...node.querySelectorAll("*")].filter(child =>
          /auto|scroll/.test(getComputedStyle(child).overflowY) && child.scrollHeight > child.clientHeight).length };
    });
    assert.ok(metrics.x >= 0 && metrics.right <= (await page.viewport()).width + 1);
    assert.equal(metrics.overflow, false);
    assert.equal(metrics.innerScrollers, 1, "only the dialog body scrolls");
    assert.doesNotMatch(metrics.text, /<p>/);
    const headerBefore = await page.$eval('[data-testid="menu-detail-header"]', node => node.getBoundingClientRect().top);
    await page.$eval('[data-testid="menu-detail-scroll"]', node => { node.scrollTop = node.scrollHeight; });
    const headerAfter = await page.$eval('[data-testid="menu-detail-header"]', node => node.getBoundingClientRect().top);
    assert.ok(Math.abs(headerBefore - headerAfter) < 1, "title stays visible after scrolling");
    const closeVisible = await page.$eval('[role="dialog"] button[aria-label="Chiudi finestra di dialogo"]', node => {
      const box = node.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return node.contains(top);
    });
    assert.ok(closeVisible, "close stays reachable after reading long descriptions");
  }
  for (const width of [320, 390, 1280]) {
    await load(width);
    assert.equal(await page.evaluate(() => window.detailRequests), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(await page.$$eval("h2", nodes => nodes.slice(0, 2).map(n => n.textContent)), ["Vini", "Bevande"]);
    assert.equal(await page.$('[data-testid="drink-detail-trigger-8"]'), null);
    assert.equal(await page.$('[data-testid="beer-detail-trigger-103"]'), null);
    const rowHeight = await page.$eval('[data-testid="drink-detail-trigger-1"]', node => node.getBoundingClientRect().height);
    assert.ok(rowHeight < 220, `long description must not stretch menu row: ${rowHeight}px`);
    if (width === 390) await page.screenshot({ path: "/tmp/menu-redesign-list.png" });
    await click("drink-detail-trigger-1");
    await verifyDialog("drink");
    if (width === 390) await page.screenshot({ path: "/tmp/menu-redesign-dialog.png" });
    assert.ok(await page.$eval('[role="dialog"]', node => node.textContent.includes("€5.50") && node.textContent.includes("Cantina prova")));
    await close();
    await click("beer-detail-trigger-101");
    await verifyDialog("beer");
    assert.equal(await page.evaluate(() => window.detailRequests), 1);
    assert.ok(await page.$eval('[role="dialog"]', node => node.textContent.includes("44") && node.textContent.includes("5,00")));
    await close();
    await click("beer-detail-trigger-102");
    await verifyDialog("beer");
    assert.equal(await page.evaluate(() => window.detailRequests), 1, "embedded description requires no extra request");
    await close();
    assert.ok(await page.$('a[href="/beer/101"]'));
    await page.$eval('[aria-label="Aggiungi ai preferiti"]', node => node.click());
    await page.$eval('[aria-label="Check-in"]', node => node.click());
    assert.deepEqual(await page.evaluate(() => window.actions), { favorite: 1, checkin: 1 });
    assert.equal(await page.$('[role="dialog"]'), null);
    console.log(`PASS ${width}px: wine grouping, full descriptions, tap/cantina popups, prices, independent actions, single scroll`);
  }
  await load(390, "?legacy");
  await click("drink-detail-trigger-1");
  await verifyDialog("drink");
  await close();
  await load(390);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await click("drink-detail-trigger-1");
  await verifyDialog("drink");
  const darkBackground = await page.$eval('[role="dialog"]', node => getComputedStyle(node).backgroundColor);
  assert.notEqual(darkBackground, "rgb(252, 250, 246)", "dialog must respect dark mode");
  await close();
  await load(390, "?error");
  await click("beer-detail-trigger-101");
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent.includes("Non è stato possibile"));
  await close();
  assert.deepEqual(errors, []);
  console.log("PASS legacy products and explicit API error state");
} finally {
  await browser.close();
}
