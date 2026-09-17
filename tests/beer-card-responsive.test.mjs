import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import test, { after, before } from "node:test";
import puppeteer from "puppeteer";

const PORT = 41731;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const VIEWPORT_WIDTHS = [320, 360, 375, 390, 412];
let server;
let browser;

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/test-fixtures/beer-card-responsive.html`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Vite non è diventato disponibile entro 30 secondi");
}

before(async () => {
  server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  await waitForServer();
  const systemChromium = spawnSync("which", ["chromium"], { encoding: "utf8" }).stdout.trim();
  browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || systemChromium || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

after(async () => {
  await browser?.close();
  server?.kill("SIGTERM");
});

for (const width of VIEWPORT_WIDTHS) {
  test(`${width}px: Taplist e Cantina non hanno overflow o sovrapposizioni`, async () => {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1200, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/test-fixtures/beer-card-responsive.html`, {
      waitUntil: "networkidle0",
    });

    const result = await page.evaluate(() => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      };
      const overlaps = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const cardInfo = (selector) => {
        const card = document.querySelector(selector);
        const content = card.querySelector('[data-testid="beer-card-content"]');
        const prices = card.querySelector('[data-testid="beer-card-prices"]');
        const actions = card.querySelector('[data-testid="beer-card-actions"]');
        const cardRect = rect(card);
        const contentRect = rect(content);
        const priceRect = rect(prices);
        const actionRect = rect(actions);
        return {
          cardRect,
          contentRect,
          priceRect,
          actionRect,
          cardHasNoOverflow: card.scrollWidth <= card.clientWidth + 1,
          contentFitsCard:
            contentRect.left >= cardRect.left - 1 && contentRect.right <= cardRect.right + 1,
          pricesDoNotOverlapActions: !overlaps(priceRect, actionRect),
          display: getComputedStyle(card).display,
          gridColumnCount: getComputedStyle(card).gridTemplateColumns.split(" ").length,
          borderRadius: getComputedStyle(card).borderRadius,
          hasSharedSlots: Boolean(content && prices && actions),
        };
      };

      return {
        pageHasNoOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        tap: cardInfo('[data-testid="taplist-tap-71"]'),
        bottle: cardInfo('[data-testid="bottle-72"]'),
        tapPriceRows: document.querySelectorAll(
          '[data-testid="taplist-tap-71"] [data-testid="beer-card-prices"] > *',
        ).length,
        badgesVisible:
          document.querySelector('[data-testid="taplist-tap-71"]').textContent.includes("0,0%") &&
          document.querySelector('[data-testid="bottle-72"]').textContent.includes("0,0%"),
      };
    });

    assert.equal(result.pageHasNoOverflow, true, "la pagina supera la larghezza del viewport");
    assert.equal(result.tapPriceRows, 3, "la Taplist non mostra tutti e tre i prezzi");
    assert.equal(result.badgesVisible, true, "grado o badge non sono renderizzati in entrambe le card");

    for (const [name, card] of Object.entries({ Taplist: result.tap, Cantina: result.bottle })) {
      assert.equal(card.cardHasNoOverflow, true, `${name}: la card ha overflow orizzontale`);
      assert.equal(card.contentFitsCard, true, `${name}: la colonna di contenuto esce dalla card`);
      assert.equal(card.pricesDoNotOverlapActions, true, `${name}: prezzi e azioni si sovrappongono`);
      assert.equal(card.hasSharedSlots, true, `${name}: manca uno slot strutturale condiviso`);
    }

    assert.equal(result.tap.display, "grid");
    assert.equal(result.bottle.display, "grid");
    assert.equal(result.tap.gridColumnCount, 4);
    assert.equal(result.bottle.gridColumnCount, 3);
    assert.equal(result.tap.borderRadius, result.bottle.borderRadius);
    await page.close();
  });
}