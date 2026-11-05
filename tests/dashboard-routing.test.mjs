import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Read the actual Route expressions, not a second implementation of role routing.
const source = await readFile("client/src/App.tsx", "utf8");
const app = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const routes = new Map();
function visit(node) {
  if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(app) === "Route") {
    const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
    const path = attrs.find((attr) => attr.name.getText(app) === "path")?.initializer;
    if (path && ts.isStringLiteral(path)) routes.set(path.text, attrs);
  }
  ts.forEachChild(node, visit);
}
visit(app);

const components = {
  SmartPubDashboard: "pub",
  BreweryDashboard: "brewery",
  AdminDashboardNew: "admin",
  UserProfile: "profile",
};
function routeComponent(path, typedUser) {
  const component = routes.get(path)?.find((attr) => attr.name.getText(app) === "component");
  assert.ok(component?.initializer && ts.isJsxExpression(component.initializer), `${path}: component missing`);
  const expression = component.initializer.expression.getText(app);
  const js = ts.transpileModule(`(${expression})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return vm.runInNewContext(js, { typedUser, ...components });
}

for (const [role, expected] of [
  ["customer", "profile"], ["pub_owner", "pub"],
  ["brewery_owner", "brewery"], ["admin", "admin"],
]) {
  test(`/dashboard: activeRole ${role} wins over other roles`, () => {
    assert.equal(routeComponent("/dashboard", {
      activeRole: role, roles: ["pub_owner", "brewery_owner", "admin"], userType: "admin",
    }), expected);
  });
  for (const field of ["roles", "userType"]) {
    test(`/dashboard: ${field} fallback for ${role}`, () => {
      for (const activeRole of [undefined, null]) {
        assert.equal(routeComponent("/dashboard", {
          activeRole, [field]: field === "roles" ? [role] : role,
        }), expected);
      }
    });
  }
  test(`/profile always opens the profile for ${role}`, () => {
    assert.equal(routeComponent("/profile", { activeRole: role }), "profile");
  });
}

test("/dashboard: unauthenticated and unset roles still resolve to the profile", () => {
  for (const user of [null, undefined, {}, { roles: [] }]) {
    assert.equal(routeComponent("/dashboard", user), "profile");
  }
});

test("/dashboard: fallback priority for accounts with multiple roles stays unchanged", () => {
  assert.equal(routeComponent("/dashboard", { roles: ["admin", "brewery_owner", "pub_owner"] }), "pub");
  assert.equal(routeComponent("/dashboard", { roles: ["admin", "brewery_owner"] }), "brewery");
});

test("current dashboards and standalone customer actions remain routed", () => {
  assert.equal(routeComponent("/admin"), "admin");
  assert.equal(routeComponent("/brewery-dashboard"), "brewery");
  for (const path of ["/impostazioni", "/settings", "/activity", "/notifications",
    "/my-cellar", "/my-wishlist", "/my-stats", "/admin/edit-pub/:id", "/festival-dashboard"]) {
    assert.ok(routes.has(path), `Missing action route: ${path}`);
  }
  for (const [name, file] of [
    ["UserProfile", "user-profile-new"], ["SmartPubDashboard", "smart-pub-dashboard"],
    ["BreweryDashboard", "brewery-dashboard"], ["AdminDashboardNew", "admin-dashboard-new"],
  ]) {
    assert.match(source, new RegExp(`const ${name}\\s*=\\s*lazy\\(\\(\\) => import\\("@/pages/${file}"\\)\\)`));
  }
});

test("legacy dashboard files, imports and route entries stay removed", async () => {
  for (const file of ["user-dashboard", "pub-dashboard"]) {
    await assert.rejects(access(`client/src/pages/${file}.tsx`), { code: "ENOENT" });
    assert.ok(!source.includes(`@/pages/${file}`));
    assert.ok(!routes.has(`/${file}`));
  }
});
