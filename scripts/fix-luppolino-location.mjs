#!/usr/bin/env node
import { pathToFileURL } from "node:url";

// Verified against the public pub record and the OSM POI at the same address:
// https://www.openstreetmap.org/node/12814925943 (ODbL, OpenStreetMap contributors).
export const LOCATION_FIX = Object.freeze({
  id: 7,
  slug: "luppolino-pub",
  name: "Luppolino Pub",
  before: Object.freeze({ lat: 45.35, lng: 11.8667 }),
  after: Object.freeze({ lat: 45.3451263, lng: 11.8698719 }),
});

export class LocationFixError extends Error {}

export function parseMode(args) {
  if (args.length === 0) return "preview";
  if (args.length === 1 && args[0] === "--apply") return "apply";
  if (args.length === 1 && args[0] === "--rollback") return "rollback";
  if (args.length === 1 && args[0] === "--help") return "help";
  throw new LocationFixError("Opzioni non valide. Usa nessuna opzione, --apply, --rollback oppure --help.");
}

function samePoint(row, point) {
  return row.latitude != null && row.longitude != null &&
    Number(row.latitude) === point.lat && Number(row.longitude) === point.lng;
}

/** The caller supplies a dedicated pg client; importing this module never connects. */
export async function runLocationFix(client, { mode = "preview", log = console.log } = {}) {
  if (!["preview", "apply", "rollback"].includes(mode)) {
    throw new LocationFixError("Modalità non valida.");
  }
  const source = mode === "rollback" ? LOCATION_FIX.after : LOCATION_FIX.before;
  const target = mode === "rollback" ? LOCATION_FIX.before : LOCATION_FIX.after;
  let transactionOpen = false;
  try {
    await client.query(mode === "preview" ? "BEGIN READ ONLY" : "BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const result = await client.query(
      `SELECT id, name, slug, address, city, latitude, longitude
       FROM pubs WHERE slug = $1${mode === "preview" ? "" : " FOR UPDATE"}`,
      [LOCATION_FIX.slug],
    );
    if (result.rows.length !== 1) {
      throw new LocationFixError("Atteso un solo Luppolino Pub: nessuna modifica. Controlla il database selezionato.");
    }
    const pub = result.rows[0];
    if (pub.id !== LOCATION_FIX.id || pub.slug !== LOCATION_FIX.slug || pub.name !== LOCATION_FIX.name) {
      throw new LocationFixError("Identità del locale diversa da quella attesa: nessuna modifica.");
    }
    log(`${pub.name} (id ${pub.id}) — ${pub.address}, ${pub.city}`);
    log(`Coordinate attuali: ${pub.latitude}, ${pub.longitude}`);
    log(`Coordinate richieste: ${target.lat}, ${target.lng}`);
    if (samePoint(pub, target)) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      log("Il punto è già quello richiesto: nessuna modifica.");
      return { status: "unchanged", pub };
    }
    if (!samePoint(pub, source)) {
      throw new LocationFixError("Le coordinate sono state cambiate rispetto ai valori attesi: interrotto per non sovrascriverle.");
    }
    if (mode === "preview") {
      await client.query("ROLLBACK");
      transactionOpen = false;
      log("ANTEPRIMA: nessun dato modificato. Per confermare, riesegui con --apply.");
      return { status: "preview", pub };
    }
    const updated = await client.query(
      `UPDATE pubs SET latitude = $1, longitude = $2, updated_at = NOW()
       WHERE id = $3 AND slug = $4 AND name = $5 AND latitude = $6 AND longitude = $7
       RETURNING id, name, slug, address, city, latitude, longitude`,
      [target.lat, target.lng, LOCATION_FIX.id, LOCATION_FIX.slug, LOCATION_FIX.name, source.lat, source.lng],
    );
    if (updated.rowCount !== 1 || !samePoint(updated.rows[0] ?? {}, target)) {
      throw new LocationFixError("Aggiornamento non confermato per un solo locale: transazione annullata.");
    }
    await client.query("COMMIT");
    transactionOpen = false;
    log(mode === "rollback" ? "Ripristinate le coordinate precedenti." : "Corrette le coordinate di Luppolino Pub.");
    log("Riavvia il solo processo PM2 fermenta per svuotare la cache del server, poi ricarica l’app.");
    return { status: mode === "rollback" ? "restored" : "applied", pub: updated.rows[0] };
  } catch (error) {
    if (transactionOpen) {
      try { await client.query("ROLLBACK"); } catch { /* The connection may already be closed. */ }
    }
    throw error;
  }
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "help") {
    console.log(`Dalla cartella dell’app sul VPS (Node >= 20.12):
  node --env-file=.env scripts/fix-luppolino-location.mjs             # sola anteprima
  node --env-file=.env scripts/fix-luppolino-location.mjs --apply     # correzione
  node --env-file=.env scripts/fix-luppolino-location.mjs --rollback  # ripristino
Usa il DATABASE_URL della stessa app PM2. Non vengono modificati altri locali o menu.`);
    return;
  }
  if (!process.env.DATABASE_URL) {
    throw new LocationFixError("DATABASE_URL assente. Esegui sul VPS dalla cartella dell’app usando --env-file=.env.");
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 8000,
    statement_timeout: 15000,
  });
  try {
    const client = await pool.connect();
    try { await runLocationFix(client, { mode }); } finally { client.release(); }
  } finally { await pool.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Never echo database error messages/stacks: they can include credentials.
    console.error(error instanceof LocationFixError
      ? error.message
      : "Errore di connessione o query. Verifica database e permessi sul VPS; riesegui l’anteprima per controllare lo stato.");
    process.exitCode = 1;
  });
}
