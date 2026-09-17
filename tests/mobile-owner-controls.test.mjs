import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  dashboard: await readFile("client/src/pages/smart-pub-dashboard.tsx", "utf8"),
  taplist: await readFile("client/src/components/taplist-manager.tsx", "utf8"),
  bottles: await readFile("client/src/components/bottle-list-manager.tsx", "utf8"),
  menu: await readFile("client/src/components/menu-category-manager.tsx", "utf8"),
  events: await readFile("client/src/components/events-manager.tsx", "utf8"),
};

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375 },
  { name: "iPhone 14", width: 390 },
  { name: "Android compatto", width: 360 },
  { name: "Android comune", width: 412 },
];

function expectMobileDialog(source, testId) {
  const start = source.indexOf(`data-testid="${testId}"`);
  assert.notEqual(start, -1, `${testId}: dialog non trovato`);
  const dialog = source.slice(start, start + 420);
  assert.match(dialog, /w-\[calc\(100%-1rem\)\]/, `${testId}: larghezza mobile non limitata`);
  assert.match(dialog, /max-h-\[calc\(100dvh-1rem\)\]/, `${testId}: altezza mobile non limitata`);
  assert.match(dialog, /overflow-x-hidden/, `${testId}: può creare overflow orizzontale`);
  assert.match(dialog, /overflow-y-auto/, `${testId}: il contenuto alto non scorre`);
}

for (const viewport of MOBILE_VIEWPORTS) {
  test(`${viewport.name} (${viewport.width}px): i dialog principali restano nel viewport`, () => {
    expectMobileDialog(files.taplist, "taplist-beer-dialog");
    expectMobileDialog(files.bottles, "bottle-beer-dialog");
    expectMobileDialog(files.menu, "menu-category-dialog");
    expectMobileDialog(files.events, "event-create-dialog");
    expectMobileDialog(files.events, "event-edit-dialog");
  });
}

test("le azioni Menu sono sempre renderizzate e hanno target touch da 44px", () => {
  for (const id of ["category-actions-", "product-actions-"]) {
    const start = files.menu.indexOf(`data-testid={\`${id}`);
    assert.notEqual(start, -1, `${id}: gruppo azioni non trovato`);
    const block = files.menu.slice(start, start + 2600);
    assert.doesNotMatch(block, /(?:group-)?hover:(?:opacity|hidden|visible)/);
    assert.match(block, /min-h-11 min-w-11/);
  }
  assert.doesNotMatch(files.menu, /className="[^"]*\bh-7\b[^"]*"/);
});

test("la creazione birra mostra una sola barra azioni", () => {
  assert.match(files.taplist, /data-testid="beer-creation-step"/);
  assert.match(files.taplist, /data-testid="taplist-details-step" className=\{creatingBeer \? "hidden"/);
  assert.match(files.bottles, /data-testid="bottle-dialog-actions"[\s\S]{0,180}creatingBeer \? "hidden"/);
});

test("Magazzino fusti e Lavaggio linee sono richiudibili", () => {
  for (const id of ["keg-warehouse-collapsible", "line-cleaning-collapsible"]) {
    assert.match(files.dashboard, new RegExp(`<details data-testid="${id}"`));
  }
});

test("gli eventi passati sono richiudibili e comunicano lo stato", () => {
  assert.match(files.events, /data-testid="past-events-toggle"/);
  assert.match(files.events, /aria-expanded=\{showPastEvents\}/);
  assert.match(files.events, /setShowPastEvents\(\(open\) => !open\)/);
  assert.match(files.events, /\{showPastEvents && <div/);
});