import test from "node:test";
import assert from "node:assert/strict";
import { moveInventoryItem, isCompleteInventoryOrder } from "../shared/inventory-order";
import { readFileSync } from "node:fs";

test("Taplist: spostamento avanti/indietro rinumera subito da 1 a X senza mutare i dati", () => {
  const original = [{ id: 10, tapNumber: 8 }, { id: 20, tapNumber: 4 }, { id: 30, tapNumber: 9 }];
  const moved = moveInventoryItem(original, 2, 0, "tapNumber");
  assert.deepEqual(moved.map(item => [item.id, item.tapNumber]), [[30, 1], [10, 2], [20, 3]]);
  assert.deepEqual(moveInventoryItem(moved, 0, 2, "tapNumber").map(item => [item.id, item.tapNumber]), [[10, 1], [20, 2], [30, 3]]);
  assert.deepEqual(original.map(item => item.tapNumber), [8, 4, 9]);
});

test("Prodotti e Cantina: ordine persistito zero-based, posizione visibile uno-based", () => {
  const moved = moveInventoryItem([{ id: 10, orderIndex: 5 }, { id: 20, orderIndex: 10 }], 0, 1, "orderIndex");
  assert.deepEqual(moved, [{ id: 20, orderIndex: 0 }, { id: 10, orderIndex: 1 }]);
});

test("Drop annullati, fuori lista o invariati non alterano i dati", () => {
  const original = [{ id: 1 }];
  for (const [from, to] of [[0, 0], [-1, 0], [0, 2], [NaN, 0], [0, 0.5]]) {
    assert.equal(moveInventoryItem(original, from, to, "tapNumber"), original);
  }
});

test("API: solo una permutazione completa della lista autorizzata è valida", () => {
  assert.equal(isCompleteInventoryOrder([{ id: 2 }, { id: 1 }], [1, 2]), true);
  for (const invalid of [null, {}, [{ id: 1 }], [{ id: 1 }, { id: 1 }], [{ id: 1 }, { id: 99 }], [{ id: "1" }, { id: 2 }], [null, { id: 2 }]]) {
    assert.equal(isCompleteInventoryOrder(invalid, [1, 2]), false);
  }
});

test("Birrificio: dock mobile con cinque voci e Info/Novità sotto Home", () => {
  const source = readFileSync("client/src/pages/brewery-dashboard.tsx", "utf8");
  const dock = source.slice(source.indexOf("{/* ── BOTTOM DOCK DASHBOARD BIRRIFICIO"), source.indexOf("{/* Profile Edit Dialog"));
  assert.equal([...dock.matchAll(/\{ id: '/g)].length, 5);
  assert.doesNotMatch(dock, /overflow-x-auto|min-w-max/);
  assert.match(dock, /activeTab === 'info' \|\| activeTab === 'annunci'/);
  assert.match(source, /label: 'Info Birrificio'.*tab: 'info'/);
  assert.match(source, /label: 'Novità & Uscite'.*tab: 'annunci'/);
});
