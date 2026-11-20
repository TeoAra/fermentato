import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { getBreweryDescription, parseBreweryProfilePatch, publicBreweryProfile } from "../shared/brewery-profile";

test("legacy descriptions become plain multiline text, not HTML controls or tags", () => {
  assert.equal(getBreweryDescription({ description: "Breve", descriptionHtml: "&lt;p&gt;Storia&lt;/p&gt;&lt;p&gt;Filosofia&lt;/p&gt;" }), "Storia\nFilosofia");
  assert.equal(getBreweryDescription({ descriptionHtml: "<p></p>", description: "Testo\nnormale" }), "Testo\nnormale");
  assert.equal(getBreweryDescription({ richContent: "<p>Precedente</p>" }), "Precedente");
  assert.deepEqual(parseBreweryProfilePatch({ description: "" }), { description: null, descriptionHtml: null });
  assert.deepEqual(parseBreweryProfilePatch({ descriptionHtml: "<p>Uno</p><p>Due</p>" }), { description: "Uno\nDue", descriptionHtml: null });
});
test("partial patches preserve omissions, explicit clearing, and three-way coordinate semantics", () => {
  assert.deepEqual(parseBreweryProfilePatch({ phone: "" }), { phone: null });
  assert.deepEqual(parseBreweryProfilePatch({ phone: null }), { phone: null });
  assert.deepEqual(parseBreweryProfilePatch({ latitude: undefined }), {});
  assert.deepEqual(parseBreweryProfilePatch({ latitude: "", longitude: null }), { latitude: null, longitude: null });
  assert.deepEqual(parseBreweryProfilePatch({ latitude: 0, longitude: "0" }), { latitude: "0", longitude: "0" });
  assert.deepEqual(parseBreweryProfilePatch({ logoUrl: "/uploads/legacy.png" }), { logoUrl: "/uploads/legacy.png" });
  assert.deepEqual(parseBreweryProfilePatch({ logoUrl: null }), { logoUrl: null });
  for (const input of [{ latitude: 91 }, { longitude: -181 }, { latitude: "NaN" }, { websiteUrl: "javascript:alert(1)" }]) {
    assert.throws(() => parseBreweryProfilePatch(input), z.ZodError);
  }
  assert.deepEqual(parseBreweryProfilePatch({ id: 900, breweryId: 900, rating: "5", isClosed: true, phone: "0123" }), { phone: "0123" });
});

function find(root: ts.Node, predicate: (node: ts.Node) => boolean): any {
  let result: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (predicate(node)) { result = node; return; }
    if (!result) ts.forEachChild(node, visit);
  };
  visit(root); assert.ok(result, "Expected real source node"); return result;
}
const ast = (file: string) => ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
const routes = ast("server/routes.ts"), admin = ast("server/routes-admin.ts"), auth = ast("server/auth.ts");
function evaluate(code: string, globals: Record<string, any> = {}) {
  const js = ts.transpileModule(`const result=${code};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(`${js}\nresult`, { ...globals, console });
}
const middleware = Object.fromEntries(["isAuthenticated", "isAdmin"].map(name => [
  name, evaluate(find(auth, n => ts.isVariableDeclaration(n) && n.name.getText(auth) === name).initializer.getText(auth)),
]));
function route(source: ts.SourceFile, method: string, path: string, globals: Record<string, any>) {
  const call = find(source, n => ts.isCallExpression(n) && n.expression.getText(source) === `app.${method}` &&
    n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === path);
  return call.arguments.slice(1).map((node: ts.Node) => ts.isIdentifier(node)
    ? middleware[node.text] : evaluate(node.getText(source), globals));
}

test("actual owner/admin routes round-trip public fields without losing omitted data or widening access", async () => {
  const initial = (id: number) => ({
    id, name: `Birrificio ${id}`, location: "Via Prova 1", region: "Veneto", country: "Italia",
    description: "Breve", descriptionHtml: "<p>Storia completa</p><p>Seconda riga</p>",
    latitude: "45.1234", longitude: "11.9876", logoUrl: "https://example.test/logo.png",
    coverImageUrl: "https://example.test/cover.png", email: "pubblica@example.test",
    phone: "123", websiteUrl: "https://example.test/", vatNumber: "VAT-RESERVED", closedSource: "internal",
  });
  const rows = new Map([1, 2].map(id => [id, initial(id)]));
  let cacheBusts = 0;
  const update = async (id: number, patch: any) => {
    if (!rows.has(id)) return undefined;
    const row = { ...rows.get(id)!, ...patch }; rows.set(id, row); return row;
  };
  const globals = {
    parseBreweryProfilePatch, publicBreweryProfile, z,
    storage: {
      getUser: async (id: string) => ({ id, breweryId: id === "owner" ? 1 : id === "other" ? 2 : null }),
      getBrewery: async (id: number) => rows.get(id),
      updateBrewery: update,
    },
    db: {
      update: () => ({ set: (patch: any) => ({ where: (id: number) => ({
        returning: async () => { const row = await update(id, patch); return row ? [row] : []; },
      }) }) }),
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: "owner" }] }) }) }),
    },
    breweries: { id: "id" }, users: { id: "id", breweryId: "breweryId" }, eq: (_key: any, id: any) => id,
    clearCatalogCaches: () => cacheBusts++, bustCatalogCaches: () => cacheBusts++,
  };
  const ownerPatch = route(routes, "patch", "/api/brewery/profile", globals);
  const adminPatch = route(admin, "patch", "/api/admin/breweries/:id", globals);
  const visitorGet = route(routes, "get", "/api/breweries/:id", globals);
  const privateGet = route(admin, "get", "/api/admin/breweries/:id/profile", globals);
  async function run(chain: any[], user: any, body = {}, id = "1", method = "PATCH") {
    const req = { user, body, params: { id }, method, isAuthenticated: () => !!user };
    const res: any = {
      code: 200, body: null, headers: {}, status(code: number) { this.code = code; return this; },
      json(body: any) { this.body = body; return this; },
      setHeader(key: string, value: string) { this.headers[key] = value; },
    };
    async function next(index = 0): Promise<void> {
      if (index >= chain.length) return;
      let forward = false;
      await chain[index](req, res, () => { forward = true; });
      if (forward) await next(index + 1);
    }
    await next(); return res;
  }
  const owner = { id: "owner", userType: "brewery_owner" }, administrator = { id: "admin", userType: "admin" };
  for (const [chain, user] of [[ownerPatch, owner], [adminPatch, administrator]] as const) {
    const saved = await run(chain, user, { description: "La nostra storia\nSeconda riga", phone: "456" });
    assert.equal(saved.code, 200);
    assert.equal(saved.body.descriptionHtml, null);
    assert.equal(saved.body.latitude, "45.1234");
    assert.equal(saved.body.coverImageUrl, "https://example.test/cover.png");
    assert.equal(saved.body.vatNumber, "VAT-RESERVED");
    const visit = await run(visitorGet, null, {}, "1", "GET");
    assert.equal(visit.body.description, "La nostra storia\nSeconda riga");
    assert.equal(visit.body.phone, "456");
    assert.equal(visit.body.email, "pubblica@example.test");
    for (const field of ["vatNumber", "closedSource", "descriptionHtml"]) assert.ok(!(field in visit.body));
    const cleared = await run(chain, user, { description: null, phone: null, websiteUrl: "" });
    assert.equal(cleared.code, 200);
    assert.equal((await run(visitorGet, null, {}, "1", "GET")).body.description, "");
    assert.equal(cleared.body.phone, null);
    assert.equal(cleared.body.latitude, "45.1234");
  }
  assert.equal((await run(ownerPatch, null, { phone: "x" })).code, 401);
  assert.equal((await run(ownerPatch, { id: "customer" }, { phone: "x" })).code, 403);
  assert.equal((await run(adminPatch, owner, { phone: "x" }, "2")).code, 403);
  assert.equal((await run(privateGet, owner, {}, "1", "GET")).code, 403);
  assert.equal((await run(privateGet, null, {}, "1", "GET")).code, 401);
  const full = await run(privateGet, administrator, {}, "1", "GET");
  assert.equal(full.body.vatNumber, "VAT-RESERVED");
  assert.equal(full.headers["Cache-Control"], "private, no-store");
  await run(ownerPatch, owner, { id: 2, breweryId: 2, phone: "Solo mio" });
  assert.equal(rows.get(1)?.phone, "Solo mio"); assert.equal(rows.get(2)?.phone, "123");
  assert.equal((await run(ownerPatch, owner, { latitude: "invalid" })).code, 400);
  assert.equal((await run(ownerPatch, { ...owner, suspendedUntil: "2999-01-01" }, { phone: "x" })).code, 403);
  assert.equal((await run(adminPatch, administrator, { phone: "x" }, "900")).code, 404);
  assert.ok(cacheBusts >= 5);
});
