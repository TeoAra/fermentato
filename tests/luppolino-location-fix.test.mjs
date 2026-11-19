import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { LOCATION_FIX, LocationFixError, parseMode, runLocationFix } from "../scripts/fix-luppolino-location.mjs";

const original = () => ({
  id: LOCATION_FIX.id, slug: LOCATION_FIX.slug, name: LOCATION_FIX.name,
  address: "Via Sant’Andrea, 29", city: "Albignasego",
  latitude: "45.35000000", longitude: "11.86670000",
});

// An isolated transaction double: no development or production DB is touched.
function database(rows = [original()], { failUpdate = false, affectedRows = 1 } = {}) {
  let committed = structuredClone(rows), pending;
  const calls = [];
  return {
    calls,
    get rows() { return committed; },
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.startsWith("BEGIN")) pending = structuredClone(committed);
      else if (sql === "ROLLBACK") pending = undefined;
      else if (sql === "COMMIT") { committed = pending; pending = undefined; }
      else if (sql.startsWith("SET LOCAL")) { /* Transaction-scoped safety limits. */ }
      else if (sql.trimStart().startsWith("SELECT")) {
        assert.deepEqual(values, [LOCATION_FIX.slug]);
        return { rows: structuredClone(pending) };
      } else if (sql.trimStart().startsWith("UPDATE")) {
        assert.match(sql, /WHERE id = \$3 AND slug = \$4 AND name = \$5 AND latitude = \$6 AND longitude = \$7/);
        assert.match(sql, /RETURNING id, name, slug, address, city, latitude, longitude/);
        if (failUpdate) throw new Error("Simulated query failure");
        const [lat, lng, id, slug, name, fromLat, fromLng] = values;
        assert.equal(id, LOCATION_FIX.id);
        assert.equal(slug, LOCATION_FIX.slug);
        assert.equal(name, LOCATION_FIX.name);
        assert.equal(Number(pending[0].latitude), fromLat);
        assert.equal(Number(pending[0].longitude), fromLng);
        if (affectedRows !== 1) return { rowCount: affectedRows, rows: [] };
        pending[0].latitude = String(lat);
        pending[0].longitude = String(lng);
        return { rowCount: 1, rows: structuredClone(pending) };
      } else throw new Error(`Unexpected SQL in test: ${sql}`);
      return { rows: [] };
    },
  };
}
const run = (db, mode = "preview") => runLocationFix(db, { mode, log() {} });
const updates = db => db.calls.filter(c => c.sql.trimStart().startsWith("UPDATE"));

test("CLI defaults to preview and requires exactly one explicit write flag", () => {
  assert.equal(parseMode([]), "preview");
  assert.equal(parseMode(["--apply"]), "apply");
  assert.equal(parseMode(["--rollback"]), "rollback");
  assert.equal(parseMode(["--help"]), "help");
  for (const args of [["--force"], ["--apply", "--rollback"], ["--aply"], ["--apply", "--apply"]]) {
    assert.throws(() => parseMode(args), LocationFixError);
  }
});

test("preview is a read-only transaction with no writes", async () => {
  const db = database();
  assert.equal((await run(db)).status, "preview");
  assert.equal(db.calls[0].sql, "BEGIN READ ONLY");
  assert.equal(updates(db).length, 0);
  assert.equal(db.calls.at(-1).sql, "ROLLBACK");
  assert.deepEqual(db.rows, [original()]);
});

test("apply updates only the guarded pub and commits once", async () => {
  const db = database();
  assert.equal((await run(db, "apply")).status, "applied");
  assert.match(db.calls.find(c => c.sql.includes("SELECT")).sql, /FOR UPDATE$/);
  assert.equal(updates(db).length, 1);
  assert.equal(db.calls.filter(c => c.sql === "COMMIT").length, 1);
  assert.equal(Number(db.rows[0].latitude), LOCATION_FIX.after.lat);
  assert.equal(Number(db.rows[0].longitude), LOCATION_FIX.after.lng);
  assert.equal(db.rows[0].name, LOCATION_FIX.name);
});

test("reapplying is idempotent", async () => {
  const db = database();
  await run(db, "apply");
  assert.equal((await run(db, "apply")).status, "unchanged");
  assert.equal(updates(db).length, 1);
});

test("rollback restores the exact old point and is idempotent", async () => {
  const db = database();
  await run(db, "apply");
  assert.equal((await run(db, "rollback")).status, "restored");
  assert.equal(Number(db.rows[0].latitude), LOCATION_FIX.before.lat);
  assert.equal(Number(db.rows[0].longitude), LOCATION_FIX.before.lng);
  assert.equal((await run(db, "rollback")).status, "unchanged");
  assert.equal(updates(db).length, 2);
});

test("changed points, nulls, or a different pub cannot be overwritten", async () => {
  for (const change of [
    { latitude: "45.349" }, { longitude: "11.88" }, { latitude: null },
    { id: 8 }, { name: "Un altro locale" }, { slug: "altro-pub" },
  ]) {
    for (const mode of ["preview", "apply", "rollback"]) {
      const rows = [{ ...original(), ...change }], db = database(rows);
      await assert.rejects(run(db, mode), LocationFixError);
      assert.equal(updates(db).length, 0);
      assert.equal(db.calls.at(-1).sql, "ROLLBACK");
      assert.deepEqual(db.rows, rows);
    }
  }
});

test("missing or duplicate matches abort before writing", async () => {
  for (const rows of [[], [original(), original()]]) {
    const db = database(rows);
    await assert.rejects(run(db, "apply"), LocationFixError);
    assert.equal(updates(db).length, 0);
    assert.equal(db.calls.at(-1).sql, "ROLLBACK");
  }
});

test("failed update or unexpected row count never commits", async () => {
  for (const options of [{ failUpdate: true }, { affectedRows: 0 }, { affectedRows: 2 }]) {
    const db = database([original()], options);
    await assert.rejects(run(db, "apply"));
    assert.equal(db.calls.some(c => c.sql === "COMMIT"), false);
    assert.equal(db.calls.at(-1).sql, "ROLLBACK");
    assert.deepEqual(db.rows, [original()]);
  }
});

test("invalid programmatic mode never opens a transaction", async () => {
  const db = database();
  await assert.rejects(run(db, "invalid"), LocationFixError);
  assert.equal(db.calls.length, 0);
});

test("help and missing-configuration failure do not require database access", () => {
  const env = { PATH: process.env.PATH };
  const help = spawnSync(process.execPath, ["scripts/fix-luppolino-location.mjs", "--help"], { encoding: "utf8", env });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--apply/);
  const missing = spawnSync(process.execPath, ["scripts/fix-luppolino-location.mjs", "--apply"], { encoding: "utf8", env });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /DATABASE_URL assente/);
});
