import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

test("dependency downloads do not require Replit's private registry", () => {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (entry.resolved) assert.doesNotMatch(entry.resolved, /package-firewall\.replit\./, name);
  }
});

test("deploy cleanup supports old and current internal registry hosts", () => {
  const script = readFileSync("scripts/deploy.sh", "utf8");
  const cleanup = script.split("\n").find(line => line.trim().startsWith("sed -i -E "));
  assert.ok(cleanup);
  const expression = cleanup.match(/'([^']+)'/)[1];
  for (const host of ["local", "internal"]) {
    for (const protocol of ["http", "https"]) {
      const output = execFileSync("sed", ["-E", expression], {
        input: `${protocol}://package-firewall.replit.${host}/npm/caniuse-lite/-/caniuse-lite-1.0.30001822.tgz`,
        encoding: "utf8",
      });
      assert.equal(output, "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001822.tgz");
    }
  }
});
