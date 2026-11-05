import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { isTapAttachment, formatTapAttachmentMessage } from "../shared/tap-activity";

const routesSource = readFileSync("server/routes.ts", "utf8");
const routes = ts.createSourceFile("routes.ts", routesSource, ts.ScriptTarget.Latest, true);

function findNode(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (predicate(node)) { found = node; return; }
    if (!found) ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(found, "Expected source node");
  return found;
}

function evaluate(source: string, globals: Record<string, unknown>) {
  const js = ts.transpileModule(`const extracted = ${source};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return vm.runInNewContext(`${js}\nextracted;`, globals);
}

test("only attaching, replacing or reactivating a beer creates activity", () => {
  const active = { beerId: 10, isActive: true };
  assert.equal(isTapAttachment(null, active), true);
  assert.equal(isTapAttachment(active, { beerId: 11, isActive: true }), true);
  assert.equal(isTapAttachment({ ...active, isActive: false }, active), true);
  assert.equal(isTapAttachment(active, null), false);
  assert.equal(isTapAttachment(active, { ...active, isActive: false }), false);
  assert.equal(isTapAttachment(active, { beerId: 11, isActive: false }), false);
  assert.equal(isTapAttachment(active, { ...active }), false);
  assert.equal(isTapAttachment({ beerId: 10, isActive: null }, active), false);
  assert.equal(isTapAttachment(null, { beerId: 10 }), true);
});

test("attachment notification contains pub, beer and brewery", () => {
  assert.equal(formatTapAttachmentMessage("Pub X", "IPA", "Birrificio Y"),
    'Pub X ha attaccato "IPA" di "Birrificio Y".');
  assert.equal(formatTapAttachmentMessage("Pub X", "IPA", null), 'Pub X ha attaccato "IPA".');
  assert.equal(formatTapAttachmentMessage("Pub X", "IPA", "  "), 'Pub X ha attaccato "IPA".');
});

test("storage preserves attachment date for edits/removals and refreshes it for new servings", async () => {
  const source = readFileSync("server/storage.ts", "utf8");
  const ast = ts.createSourceFile("storage.ts", source, ts.ScriptTarget.Latest, true);
  const klass = findNode(ast, node => ts.isClassDeclaration(node) && node.name?.text === "DatabaseStorage");
  const method = findNode(klass, node => ts.isMethodDeclaration(node) && node.name.getText(ast) === "updateTapListItem") as ts.MethodDeclaration;
  const previous = { id: 1, beerId: 10, isActive: true, updatedAt: new Date("2020-01-01") };
  let saved: any;
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ ...previous }] }) }) }),
    update: () => ({ set: (value: any) => {
      saved = value;
      return { where: () => ({ returning: async () => [{ ...previous, ...value }] }) };
    } }),
  };
  const update = evaluate(`async function(id, updates) ${method.body!.getText(ast)}`, {
    db, tapList: { id: "id" }, eq: () => true, isTapAttachment, Date,
  });
  for (const changes of [{ tapNumber: 2 }, { prices: { "30cl": 5 } }, { isVisible: false }, { isActive: false }, { beerId: 10 }]) {
    await update(1, changes);
    assert.equal(saved.updatedAt, previous.updatedAt);
  }
  await update(1, { beerId: 11 });
  assert.ok(saved.updatedAt > previous.updatedAt);
  previous.isActive = false;
  await update(1, { isActive: true });
  assert.ok(saved.updatedAt > previous.updatedAt);
});

test("reordering does not rewrite the attachment timestamp", () => {
  const handler = findNode(routes, node => ts.isCallExpression(node) &&
    node.arguments[0] !== undefined && ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === "/api/pubs/:id/taplist/reorder");
  assert.doesNotMatch(handler.getText(routes), /updatedAt/);
});

test("edit endpoint notifies only on a real attachment, not deactivation or metadata edits", async () => {
  const route = findNode(routes, node => ts.isCallExpression(node) &&
    node.arguments[0] !== undefined && ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === "/api/pubs/:pubId/taplist/:id" &&
    node.expression.getText(routes) === "app.patch") as ts.CallExpression;
  for (const scenario of [
    { previousActive: true, changes: { isActive: false }, expected: 0 },
    { previousActive: true, changes: { tapNumber: 3 }, expected: 0 },
    { previousActive: true, changes: { prices: { "30cl": 5 } }, expected: 0 },
    { previousActive: true, changes: { beerId: 11, isActive: false }, expected: 0 },
    { previousActive: true, changes: { beerId: 11 }, expected: 1 },
    { previousActive: false, changes: { isActive: true }, expected: 1 },
    { previousActive: false, changes: { beerId: 11, isActive: true }, expected: 1 },
  ]) {
    const previous = { id: 1, beerId: 10, isActive: scenario.previousActive };
    const notices: any[] = [];
    let status = 200;
    const handler = evaluate(route.arguments[route.arguments.length - 1].getText(routes), {
      storage: {
        getTapListByPubForOwner: async () => [previous],
        updateTapListItem: async (_: number, changes: any) => ({ ...previous, ...changes }),
        getBeer: async (id: number) => ({ id, name: "IPA" }),
        getPub: async () => ({ id: 1, name: "Pub X" }),
      },
      isAdminOrPubOwner: async () => true,
      isTapAttachment,
      notifyTapListChange: (...args: any[]) => { notices.push(args); },
      notifyWishlistBeerAvailable: () => {},
      pool: { query: async () => ({ rows: [] }) },
      broadcastPubUpdate: () => {},
      _memCache: new Map(),
      console,
    });
    const res = { status: (code: number) => { status = code; return res; }, json: () => {} };
    await handler({ user: { id: "test-owner" }, params: { pubId: "1", id: "1" }, body: scenario.changes }, res);
    assert.equal(status, 200);
    assert.equal(notices.length, scenario.expected, JSON.stringify(scenario));
  }
});

test("all follower notification channels use the full message and deduplicate users", async () => {
  const declaration = findNode(routes, node => ts.isVariableDeclaration(node) &&
    node.name.getText(routes) === "notifyTapListChange") as ts.VariableDeclaration;
  const notices: any[] = [], pushes: any[] = [];
  const notify = evaluate(declaration.initializer!.getText(routes), {
    formatTapAttachmentMessage,
    storage: {
      getPub: async () => ({ name: "Pub X" }),
      getBeer: async () => ({ breweryId: 20 }),
      getBrewery: async () => ({ name: "Birrificio Y" }),
      getUsersWhoFavoritedPub: async () => ["pub", "disabled"],
      getUsersWhoFavoritedBeer: async () => ["pub", "beer"],
      getUsersWhoFavoritedBrewery: async () => ["beer", "brewery"],
      getNotificationPreferences: async (id: string) => ({ tapChanges: id !== "disabled" }),
      createNotification: async (notice: any) => { notices.push(notice); },
    },
    sendPushToUser: (id: string, payload: any) => { pushes.push({ id, ...payload }); },
    console,
  });
  for (const type of ["new_beer", "tap_change"]) {
    notices.length = pushes.length = 0;
    await notify(1, type, "IPA", 10);
    assert.equal(notices.length, 3);
    assert.equal(pushes.length, 3);
    for (const notice of notices) assert.equal(notice.message, 'Pub X ha attaccato "IPA" di "Birrificio Y".');
    for (const push of pushes) assert.equal(push.body, 'Pub X ha attaccato "IPA" di "Birrificio Y".');
  }
});
