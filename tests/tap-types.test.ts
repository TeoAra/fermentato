import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { TAP_TYPES, normalizeTapType, getTapTypeInfo, groupTapItems } from "../shared/tap-types";
import { insertTapListSchema } from "../shared/schema";
import { moveInventoryItem } from "../shared/inventory-order";

test("three persisted types, legacy fallback, and no fourth hand-pump value", () => {
  assert.deepEqual(TAP_TYPES, ["spina", "pompa", "botte"]);
  for (const value of [null, undefined, ""]) assert.equal(normalizeTapType(value), "spina");
  assert.equal(getTapTypeInfo("pompa").label, "Hand pump");
  assert.equal(getTapTypeInfo("botte").priceLabel, "Prezzi alla botte");
  for (const tapType of TAP_TYPES) {
    assert.equal(insertTapListSchema.safeParse({ pubId: 1, beerId: 2, tapType }).success, true);
  }
  for (const tapType of ["hand pump", "handpump", "invalid", 1, {}]) {
    assert.equal(insertTapListSchema.safeParse({ pubId: 1, beerId: 2, tapType }).success, false);
  }
});

test("public groups exclude hidden/inactive only, preserve original positions and don't mutate input", () => {
  const items = [
    { id: 1, tapType: "botte", tapNumber: 3 },
    { id: 2, tapType: "pompa", tapNumber: 2 },
    { id: 3, tapType: null, tapNumber: 1 },
    { id: 4, tapType: "pompa", tapNumber: 4, isVisible: false },
    { id: 5, tapType: "botte", tapNumber: 5, isActive: false },
    { id: 6, tapType: "pompa", tapNumber: 6, isVisible: null },
  ];
  const original = structuredClone(items);
  const groups = groupTapItems(items);
  assert.deepEqual(groups.map(g => [g.label, g.items.map(i => i.id)]), [
    ["Alla spina", [3]], ["Hand pump", [2, 6]], ["Alla botte", [1]],
  ]);
  assert.deepEqual(items, original);
  for (const tapType of TAP_TYPES) {
    const single = groupTapItems([{ tapType }]);
    assert.equal(single.length, 1);
    assert.equal(single[0].label, getTapTypeInfo(tapType).label);
  }
  assert.deepEqual(groupTapItems([]), []);
});

test("mixed-service drag reorders positions 1 to X without reclassifying stock", () => {
  const items = TAP_TYPES.map((tapType, i) => ({ id: i + 1, tapType, tapNumber: i + 1 }));
  const moved = moveInventoryItem(items, 2, 0, "tapNumber");
  assert.deepEqual(moved.map(i => [i.id, i.tapNumber, i.tapType]), [[3, 1, "botte"], [1, 2, "spina"], [2, 3, "pompa"]]);
  assert.deepEqual(items.map(i => i.tapNumber), [1, 2, 3]);
});

function find(root: ts.Node, predicate: (node: ts.Node) => boolean): any {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (predicate(node)) { found = node; return; }
    if (!found) ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(found);
  return found;
}
const source = readFileSync("server/routes.ts", "utf8");
const ast = ts.createSourceFile("routes.ts", source, ts.ScriptTarget.Latest, true);
const extract = (method: string, path: string) => {
  const route = find(ast, node => ts.isCallExpression(node) && node.expression.getText(ast) === `app.${method}` &&
    node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === path);
  return route.arguments.at(-1).getText(ast);
};
function handler(code: string, globals: any) {
  const js = ts.transpileModule(`const handler = ${code};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(`${js}\nhandler;`, { ...globals });
}
const postSource = extract("post", "/api/pubs/:id/taplist");
const patchSource = extract("patch", "/api/pubs/:pubId/taplist/:id");

test("actual create/edit handlers persist all types and retain type when changing only the beer", async () => {
  for (const tapType of TAP_TYPES) {
    let row: any;
    const globals = {
      storage: {
        addToTapList: async (data: any) => (row = { id: 1, ...data }),
        getTapListByPubForOwner: async () => [row],
        updateTapListItem: async (_id: number, data: any) => (row = { ...row, ...data }),
        getBeer: async () => null,
      },
      insertTapListSchema, z,
      isAdminOrPubOwner: async () => true,
      broadcastPubUpdate() {}, _memCache: new Map(), pool: { query: async () => ({ rows: [] }) }, console,
    };
    const response = () => {
      const res: any = { code: 200, body: null, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
      return res;
    };
    const post = handler(postSource, globals), patch = handler(patchSource, globals);
    const created = response();
    await post({ user: { id: "owner" }, params: { id: "1" }, body: { beerId: 10, tapType, tapNumber: 1 } }, created);
    assert.equal(created.code, 201);
    assert.equal(created.body.tapType, tapType);
    const changed = response();
    await patch({ user: { id: "owner" }, params: { pubId: "1", id: "1" }, body: { beerId: 11 } }, changed);
    assert.equal(changed.code, 200);
    assert.equal(changed.body.tapType, tapType);
    assert.equal(changed.body.tapNumber, 1);
    const edited = response();
    const nextType = TAP_TYPES[(TAP_TYPES.indexOf(tapType) + 1) % 3];
    await patch({ user: { id: "owner" }, params: { pubId: "1", id: "1" }, body: { tapType: nextType } }, edited);
    assert.equal(edited.body.tapType, nextType);
    const invalid = response();
    await patch({ user: { id: "owner" }, params: { pubId: "1", id: "1" }, body: { tapType: "handpump" } }, invalid);
    assert.equal(invalid.code, 400);
    assert.equal(row.tapType, nextType);
    const deniedGlobals = { ...globals, isAdminOrPubOwner: async () => false };
    const denied = response();
    await handler(patchSource, deniedGlobals)({ user: { id: "other" }, params: { pubId: "1", id: "1" }, body: { tapType } }, denied);
    assert.equal(denied.code, 403);
  }
});

test("public and owner DTO mapping retains all service types and legacy nulls", () => {
  const storageSource = readFileSync("server/storage.ts", "utf8");
  const storageAst = ts.createSourceFile("storage.ts", storageSource, ts.ScriptTarget.Latest, true);
  const dto = find(storageAst, node => ts.isFunctionDeclaration(node) && node.name?.text === "mapTapDbRowToDto");
  const map = handler(dto.getText(storageAst), { safeParseDecimal: (value: any) => value == null ? null : String(value) });
  for (const tapType of [...TAP_TYPES, null]) {
    assert.equal(map({ id: 1, tap_type: tapType }).tapType, tapType);
    assert.equal(map({ id: 1, tapType }).tapType, tapType);
  }
});
