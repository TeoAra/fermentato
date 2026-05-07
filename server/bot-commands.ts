/**
 * Bot Commands — parser Gemini + esecutore per Telegram e WhatsApp.
 * Gestisce taplist e menu cibo di un pub via messaggi in italiano naturale.
 * Supporta conferma interattiva quando una ricerca restituisce più candidati.
 */
import { db } from "./db";
import {
  tapList, beers, breweries, menuCategories, menuItems,
  botConnections, botLinkTokens, pubs,
} from "@shared/schema";
import { eq, and, ilike, asc } from "drizzle-orm";
import crypto from "crypto";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Tipi ─────────────────────────────────────────────────────────────────────

export type BotAction =
  | { type: "swap"; from: string; to: string; brewery?: string }
  | { type: "hide"; beer: string }
  | { type: "show"; beer: string }
  | { type: "remove"; beer: string }
  | { type: "add"; beer: string; brewery?: string }
  | { type: "price"; beer: string; prices: Record<string, number> }
  | { type: "taplist" }
  | { type: "item_hide"; item: string }
  | { type: "item_show"; item: string }
  | { type: "item_unavailable"; item: string }
  | { type: "item_available"; item: string }
  | { type: "item_price"; item: string; price: number }
  | { type: "item_remove"; item: string }
  | { type: "item_rename"; item: string; newName: string }
  | { type: "ingredient_remove"; ingredient: string; items: "all" | string[] }
  | { type: "ingredient_add"; ingredient: string; items: string[] }
  | { type: "category_hide"; category: string }
  | { type: "category_show"; category: string }
  | { type: "menu" }
  | { type: "help" }
  | { type: "unknown"; reason: string };

export type BeerCandidate = { id: number; name: string; breweryName: string | null };

export type PendingConfirmation = {
  originalAction: BotAction;
  role: "to" | "beer";   // quale campo della action sostituire con il candidato scelto
  candidates: BeerCandidate[];
};

export type CommandResult =
  | { ok: boolean; message: string }
  | { ok: "choose"; message: string; pending: PendingConfirmation };

// ── Parser Gemini ─────────────────────────────────────────────────────────────

export async function parseCommand(message: string, taplistContext: string): Promise<BotAction> {
  const key = GEMINI_API_KEY();
  if (!key) return { type: "unknown", reason: "Gemini non configurato" };

  const prompt = `Sei l'assistente di gestione menu per un pub italiano su Fermenta.to.
Il titolare ti ha inviato questo messaggio. Analizza e restituisci UN'azione in JSON.

Birre attualmente in spillatura:
${taplistContext || "(nessuna birra in spina)"}

Messaggio: "${message}"

Rispondi SOLO con un JSON valido (nessun testo aggiuntivo):

━━ SPILLATURA (BIRRE) ━━
Sostituire una birra in spina (prezzi mantenuti):
{"type":"swap","from":"BIRRA_ATTUALE","to":"NUOVA_BIRRA","brewery":"BIRRIFICIO_OPZIONALE"}
Nascondere/mostrare dalla spillatura:
{"type":"hide","beer":"NOME"} oppure {"type":"show","beer":"NOME"}
Rimuovere/aggiungere dalla spillatura:
{"type":"remove","beer":"NOME"} oppure {"type":"add","beer":"NOME","brewery":"BIRRIFICIO_OPZIONALE"}
Aggiornare prezzo birra:
{"type":"price","beer":"NOME","prices":{"piccola":3.50,"media":5.00}}
Vedere le birre in spillatura:
{"type":"taplist"}

━━ MENU CIBO — PRODOTTI ━━
Nascondere/mostrare un prodotto:
{"type":"item_hide","item":"NOME"} oppure {"type":"item_show","item":"NOME"}
Esaurito / di nuovo disponibile:
{"type":"item_unavailable","item":"NOME"} oppure {"type":"item_available","item":"NOME"}
Cambiare prezzo prodotto:
{"type":"item_price","item":"NOME","price":12.50}
Rimuovere definitivamente un prodotto:
{"type":"item_remove","item":"NOME"}
Rinominare un prodotto:
{"type":"item_rename","item":"NOME_ATTUALE","newName":"NUOVO_NOME"}
Aggiungere ingrediente a prodotti specifici:
{"type":"ingredient_add","ingredient":"INGREDIENTE","items":["PRODOTTO 1","PRODOTTO 2"]}
Rimuovere ingrediente da tutti i prodotti che lo contengono:
{"type":"ingredient_remove","ingredient":"INGREDIENTE","items":"all"}
Rimuovere ingrediente da prodotti specifici:
{"type":"ingredient_remove","ingredient":"INGREDIENTE","items":["PRODOTTO 1","PRODOTTO 2"]}

━━ MENU CIBO — CATEGORIE ━━
Nascondere/mostrare un'intera categoria:
{"type":"category_hide","category":"NOME"} oppure {"type":"category_show","category":"NOME"}

━━ GENERALI ━━
Vedere il menu cibo: {"type":"menu"}
Aiuto: {"type":"help"}
Non capisci: {"type":"unknown","reason":"MOTIVO_BREVE"}`;

  try {
    const resp = await fetch(`${GEMINI_API_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    });
    const json = await resp.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    return JSON.parse(raw.replace(/```json|```/g, "").trim()) as BotAction;
  } catch {
    return { type: "unknown", reason: "Errore nel parsing del comando" };
  }
}

// ── Normalizzazione stringhe (case + spazi extra) ────────────────────────────

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

// ── Helpers taplist ───────────────────────────────────────────────────────────

async function getPubTaplist(pubId: number) {
  return db
    .select({
      id: tapList.id,
      beerId: tapList.beerId,
      beerName: beers.name,
      beerStyle: beers.style,
      breweryName: breweries.name,
      isVisible: tapList.isVisible,
      isActive: tapList.isActive,
      priceSmall: tapList.priceSmall,
      priceMedium: tapList.priceMedium,
      priceLarge: tapList.priceLarge,
      prices: tapList.prices,
    })
    .from(tapList)
    .leftJoin(beers, eq(tapList.beerId, beers.id))
    .leftJoin(breweries, eq(beers.breweryId, breweries.id))
    .where(and(eq(tapList.pubId, pubId), eq(tapList.isActive, true)));
}

function buildTaplistContext(items: Awaited<ReturnType<typeof getPubTaplist>>) {
  if (!items.length) return "(nessuna birra in spina)";
  return items
    .map(i =>
      `- ${i.beerName}${i.breweryName ? ` di ${i.breweryName}` : ""}${i.beerStyle ? ` (${i.beerStyle})` : ""}${!i.isVisible ? " [NASCOSTA]" : ""}`
    )
    .join("\n");
}

function fuzzyFind(name: string, items: { beerName: string | null }[]) {
  const q = norm(name);
  return items.find(i => norm(i.beerName).includes(q) || q.includes(norm(i.beerName)));
}

// ── Ricerca birra nel catalogo ────────────────────────────────────────────────

/** Punteggio di rilevanza: più alto = match migliore */
function scoreBeer(beer: BeerCandidate, beerName: string, brewery?: string): number {
  let score = 0;
  const bn   = norm(beerName);
  const name = norm(beer.name);
  const brew = norm(beer.breweryName);

  if (name === bn)              score += 200;
  else if (name.startsWith(bn)) score += 100;
  else if (name.includes(bn))   score += 50;

  if (brewery) {
    const bq = norm(brewery);
    if (brew === bq)              score += 200;
    else if (brew.startsWith(bq)) score += 100;
    else if (brew.includes(bq))   score += 50;
  }

  return score;
}

async function findBeersInCatalog(beerName: string, brewery?: string): Promise<BeerCandidate[]> {
  const rows = await db
    .select({ id: beers.id, name: beers.name, breweryName: breweries.name })
    .from(beers)
    .leftJoin(breweries, eq(beers.breweryId, breweries.id))
    .where(ilike(beers.name, `%${norm(beerName)}%`));

  if (!rows.length) return [];

  let results = rows.map(r => ({ ...r, _score: scoreBeer(r, beerName, brewery) }));

  if (brewery) {
    const bq = norm(brewery);
    const withBrewery = results.filter(r => norm(r.breweryName).includes(bq));
    if (withBrewery.length) results = withBrewery;
  }

  // Ordina per score decrescente
  results.sort((a, b) => b._score - a._score);

  // Se il primo ha score nettamente superiore al secondo (≥100 punti), proponi solo lui
  // → evita ambiguità quando il match è chiaramente uno solo
  if (results.length > 1 && results[0]._score - results[1]._score >= 100) {
    return [results[0]];
  }

  return results.map(({ _score, ...r }) => r);
}

// Formatta lista candidati raggruppata per birrificio
function formatCandidates(candidates: BeerCandidate[]): string {
  const uniqueBreweries = [...new Set(candidates.map(c => c.breweryName ?? ""))];

  if (uniqueBreweries.length === 1) {
    // Tutti dallo stesso birrificio — mostra solo i nomi delle birre
    const brew = uniqueBreweries[0];
    const header = brew ? `_${brew}:_\n` : "";
    return header + candidates.map((c, i) => `  ${i + 1}. *${c.name}*`).join("\n");
  }

  // Più birrifici → raggruppa per birrificio con numerazione globale
  const lines: string[] = [];
  let idx = 1;
  for (const brew of uniqueBreweries) {
    lines.push(`\n_${brew || "Birrificio sconosciuto"}:_`);
    for (const c of candidates.filter(x => (x.breweryName ?? "") === brew)) {
      lines.push(`  ${idx}. *${c.name}*`);
      idx++;
    }
  }
  return lines.join("\n").trim();
}

// ── Helpers menu cibo ─────────────────────────────────────────────────────────

async function getAllFoodItems(pubId: number) {
  return db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      price: menuItems.price,
      isVisible: menuItems.isVisible,
      isAvailable: menuItems.isAvailable,
      categoryId: menuItems.categoryId,
    })
    .from(menuItems)
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(eq(menuCategories.pubId, pubId));
}

function fuzzyFindItem(name: string, items: { name: string }[]) {
  const q = norm(name);
  return items.find(i => norm(i.name).includes(q) || q.includes(norm(i.name)));
}

async function getPubCategories(pubId: number) {
  return db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.pubId, pubId))
    .orderBy(asc(menuCategories.orderIndex));
}

function fuzzyFindCategory(name: string, cats: { name: string }[]) {
  const q = norm(name);
  return cats.find(c => norm(c.name).includes(q) || q.includes(norm(c.name)));
}

async function getFoodMenu(pubId: number) {
  const cats = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.pubId, pubId), eq(menuCategories.isVisible, true)))
    .orderBy(asc(menuCategories.orderIndex));

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isVisible, true))
    .orderBy(asc(menuItems.orderIndex));

  return cats.map(cat => ({
    ...cat,
    items: items.filter(i => i.categoryId === cat.id && !i.isInfoBox),
  })).filter(cat => cat.items.length > 0);
}

function formatFoodMenu(menu: Awaited<ReturnType<typeof getFoodMenu>>): string {
  if (!menu.length) return "📋 Il menu cibo è vuoto.";
  const lines: string[] = ["📋 *Menu:*"];
  for (const cat of menu) {
    lines.push(`\n*${cat.name}*`);
    for (const item of cat.items) {
      const price = item.price ? ` — €${parseFloat(item.price).toFixed(2)}` : "";
      const flags = [
        item.isVegetarian ? "🌿" : "",
        item.isSpicy ? "🌶️" : "",
        !item.isAvailable ? "⛔" : "",
      ].filter(Boolean).join("");
      lines.push(`  ${!item.isVisible ? "🙈" : "•"} ${item.name}${price}${flags ? " " + flags : ""}`);
    }
  }
  return lines.join("\n");
}

// ── Esecutore — azione risolta (candidato già scelto) ────────────────────────

async function executeResolved(
  action: BotAction,
  pubId: number,
  tap: Awaited<ReturnType<typeof getPubTaplist>>
): Promise<CommandResult> {

  switch (action.type) {

    // ── Generali ─────────────────────────────────────────────────────────────

    case "taplist": {
      if (!tap.length) return { ok: true, message: "🍺 Nessuna birra in spillatura al momento." };
      const lines = tap.map(i => {
        const brewery = i.breweryName ? ` — _${i.breweryName}_` : "";
        const style = i.beerStyle ? ` (${i.beerStyle})` : "";
        return `${i.isVisible ? "✅" : "🙈"} *${i.beerName}*${brewery}${style}`;
      });
      return { ok: true, message: `🍺 *Birre in spillatura:*\n${lines.join("\n")}` };
    }

    case "menu": {
      const food = await getFoodMenu(pubId);
      return { ok: true, message: formatFoodMenu(food) };
    }

    case "help":
      return {
        ok: true,
        message: `🤖 *Comandi disponibili:*

🍺 *Spillatura (birre):*
• *cambia* Birra A *con* Birra B (di Birrificio)
• *nascondi birra* / *mostra birra* Nome
• *rimuovi birra* / *aggiungi birra* Nome (di Birrificio)
• *prezzo* Nome: piccola 3.5 media 5.0
• *birre* — vedi taplist

🍽️ *Prodotti menu cibo:*
• *nascondi* / *mostra* Prodotto
• *esaurito* / *disponibile* Prodotto
• *prezzo* Prodotto *a* 12.50€
• *rinomina* Prodotto *in* Nuovo Nome
• *rimuovi* Prodotto — elimina definitivamente
• *togli* cipolle *da tutti i prodotti*
• *togli* pancetta *da* Burger, Club Sandwich
• *aggiungi* rucola *a* Tagliere, Bruschetta

📂 *Categorie:*
• *nascondi categoria* Dolci / *mostra categoria* Dolci

• *menu* — vedi menu completo
• *aiuto* — mostra questo messaggio`,
      };

    // ── Taplist ───────────────────────────────────────────────────────────────

    case "hide": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata in spillatura: "${action.beer}"` };
      await db.update(tapList).set({ isVisible: false }).where(eq(tapList.id, item.id));
      return { ok: true, message: `🙈 *${item.beerName}* nascosta dalla spillatura.` };
    }

    case "show": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata in spillatura: "${action.beer}"` };
      await db.update(tapList).set({ isVisible: true }).where(eq(tapList.id, item.id));
      return { ok: true, message: `✅ *${item.beerName}* riabilitata in spillatura.` };
    }

    case "remove": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata in spillatura: "${action.beer}"` };
      await db.delete(tapList).where(eq(tapList.id, item.id));
      return { ok: true, message: `🗑️ *${item.beerName}* rimossa dalla spillatura.` };
    }

    case "add": {
      const candidates = await findBeersInCatalog(action.beer, action.brewery);
      if (!candidates.length) {
        const hint = action.brewery
          ? `"${action.beer}" di "${action.brewery}" non trovata nel catalogo.`
          : `"${action.beer}" non trovata. Riprova specificando anche il birrificio: _aggiungi NomeBirra di NomeBirrificio_`;
        return { ok: false, message: `❌ ${hint}` };
      }
      if (candidates.length > 1) {
        return {
          ok: "choose",
          message: `🔍 Ho trovato ${candidates.length} birre con "${action.beer}". Quale intendi?\n\n${formatCandidates(candidates)}\n\nRispondi con il numero.`,
          pending: { originalAction: action, role: "beer", candidates },
        };
      }
      const found = candidates[0];
      const already = tap.find(i => i.beerId === found.id);
      if (already) return { ok: true, message: `ℹ️ *${found.name}* è già in spillatura.` };
      await db.insert(tapList).values({ pubId, beerId: found.id, isActive: true, isVisible: true });
      const brewInfo = found.breweryName ? ` di *${found.breweryName}*` : "";
      return { ok: true, message: `✅ *${found.name}*${brewInfo} aggiunta alla spillatura.` };
    }

    case "swap": {
      const fromItem = fuzzyFind(action.from, tap);
      if (!fromItem) return { ok: false, message: `❌ Birra non trovata in spillatura: "${action.from}"` };

      const candidates = await findBeersInCatalog(action.to, action.brewery);
      if (!candidates.length) {
        const hint = action.brewery
          ? `"${action.to}" di "${action.brewery}" non trovata nel catalogo.`
          : `"${action.to}" non trovata. Riprova specificando il birrificio: _cambia X con Y di Birrificio_`;
        return { ok: false, message: `❌ ${hint}` };
      }
      if (candidates.length > 1) {
        return {
          ok: "choose",
          message: `🔍 Ho trovato ${candidates.length} birre con "${action.to}". Quale vuoi mettere al posto di *${fromItem.beerName}*?\n\n${formatCandidates(candidates)}\n\nRispondi con il numero.`,
          pending: { originalAction: action, role: "to", candidates },
        };
      }
      const newBeer = candidates[0];
      await db.update(tapList).set({ beerId: newBeer.id }).where(eq(tapList.id, fromItem.id));
      const brewInfo = newBeer.breweryName ? ` di *${newBeer.breweryName}*` : "";
      return { ok: true, message: `🔄 *${fromItem.beerName}* sostituita con *${newBeer.name}*${brewInfo} (prezzi mantenuti).` };
    }

    case "price": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata in spillatura: "${action.beer}"` };
      const updates: Record<string, unknown> = {};
      if (action.prices.piccola != null) updates.priceSmall = String(action.prices.piccola);
      if (action.prices.media != null) updates.priceMedium = String(action.prices.media);
      if (action.prices.grande != null) updates.priceLarge = String(action.prices.grande);
      if (Object.keys(action.prices).some(k => !["piccola", "media", "grande"].includes(k))) {
        updates.prices = action.prices;
      }
      await db.update(tapList).set(updates).where(eq(tapList.id, item.id));
      const lines = Object.entries(action.prices).map(([k, v]) => `${k}: €${v}`).join(", ");
      return { ok: true, message: `💰 Prezzi aggiornati per *${item.beerName}*: ${lines}` };
    }

    // ── Prodotti menu cibo ────────────────────────────────────────────────────

    case "item_hide": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      await db.update(menuItems).set({ isVisible: false }).where(eq(menuItems.id, found.id));
      return { ok: true, message: `🙈 *${found.name}* nascosto dal menu.` };
    }

    case "item_show": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      await db.update(menuItems).set({ isVisible: true }).where(eq(menuItems.id, found.id));
      return { ok: true, message: `✅ *${found.name}* di nuovo visibile nel menu.` };
    }

    case "item_unavailable": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      await db.update(menuItems).set({ isAvailable: false }).where(eq(menuItems.id, found.id));
      return { ok: true, message: `⛔ *${found.name}* segnato come esaurito.` };
    }

    case "item_available": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      await db.update(menuItems).set({ isAvailable: true }).where(eq(menuItems.id, found.id));
      return { ok: true, message: `✅ *${found.name}* di nuovo disponibile.` };
    }

    case "item_price": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      const oldPrice = found.price ? ` (era €${parseFloat(found.price).toFixed(2)})` : "";
      await db.update(menuItems).set({ price: String(action.price.toFixed(2)) }).where(eq(menuItems.id, found.id));
      return { ok: true, message: `💰 *${found.name}* aggiornato a €${action.price.toFixed(2)}${oldPrice}.` };
    }

    case "item_remove": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      await db.delete(menuItems).where(eq(menuItems.id, found.id));
      return { ok: true, message: `🗑️ *${found.name}* rimosso definitivamente dal menu.` };
    }

    case "item_rename": {
      const all = await getAllFoodItems(pubId);
      const found = fuzzyFindItem(action.item, all);
      if (!found) return { ok: false, message: `❌ Prodotto non trovato: "${action.item}"` };
      await db.update(menuItems).set({ name: action.newName }).where(eq(menuItems.id, found.id));
      return { ok: true, message: `✏️ *${found.name}* rinominato in *${action.newName}*.` };
    }

    // ── Ingredienti ───────────────────────────────────────────────────────────

    case "ingredient_remove": {
      const allItems = await getAllFoodItems(pubId);
      const ing = norm(action.ingredient);
      const targets = action.items === "all"
        ? allItems.filter(i => norm(i.name).includes(ing) || norm(i.description).includes(ing))
        : allItems.filter(item => (action.items as string[]).some(q => norm(item.name).includes(norm(q))));

      if (!targets.length) return { ok: false, message: `❌ Nessun prodotto contiene "${action.ingredient}".` };

      const re = new RegExp(
        `(,\\s*|\\s+con\\s+|\\s+e\\s+|\\s+)?${action.ingredient.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s*,|\\s+e\\s+|\\s+con\\s+)?`,
        "gi"
      );
      const updated: string[] = [];
      for (const item of targets) {
        const newDesc = (item.description ?? "").replace(re, " ").replace(/\s{2,}/g, " ").trim();
        const newName = item.name.replace(re, " ").replace(/\s{2,}/g, " ").trim();
        await db.update(menuItems).set({ description: newDesc || null, name: newName }).where(eq(menuItems.id, item.id));
        updated.push(item.name);
      }
      return { ok: true, message: `✅ *"${action.ingredient}"* rimosso da ${updated.length} prodott${updated.length === 1 ? "o" : "i"}:\n${updated.map(n => `• ${n}`).join("\n")}` };
    }

    case "ingredient_add": {
      const allItems = await getAllFoodItems(pubId);
      const targets = allItems.filter(item =>
        action.items.some(q => norm(item.name).includes(norm(q)))
      );
      if (!targets.length) return { ok: false, message: `❌ Nessun prodotto trovato tra: ${action.items.join(", ")}` };

      const updated: string[] = [];
      for (const item of targets) {
        const already = norm(item.description).includes(norm(action.ingredient));
        if (already) { updated.push(`${item.name} (già presente)`); continue; }
        const newDesc = item.description ? `${item.description}, ${action.ingredient}` : action.ingredient;
        await db.update(menuItems).set({ description: newDesc }).where(eq(menuItems.id, item.id));
        updated.push(item.name);
      }
      return { ok: true, message: `✅ *"${action.ingredient}"* aggiunto a ${targets.length} prodott${targets.length === 1 ? "o" : "i"}:\n${updated.map(n => `• ${n}`).join("\n")}` };
    }

    // ── Categorie ─────────────────────────────────────────────────────────────

    case "category_hide": {
      const cats = await getPubCategories(pubId);
      const cat = fuzzyFindCategory(action.category, cats);
      if (!cat) return { ok: false, message: `❌ Categoria non trovata: "${action.category}"` };
      await db.update(menuCategories).set({ isVisible: false }).where(eq(menuCategories.id, cat.id));
      return { ok: true, message: `🙈 Categoria *${cat.name}* nascosta (i prodotti non sono visibili ai clienti).` };
    }

    case "category_show": {
      const cats = await getPubCategories(pubId);
      const cat = fuzzyFindCategory(action.category, cats);
      if (!cat) return { ok: false, message: `❌ Categoria non trovata: "${action.category}"` };
      await db.update(menuCategories).set({ isVisible: true }).where(eq(menuCategories.id, cat.id));
      return { ok: true, message: `✅ Categoria *${cat.name}* di nuovo visibile nel menu.` };
    }

    case "unknown":
    default:
      return {
        ok: false,
        message: `🤷 Non ho capito il comando. ${(action as any).reason ?? ""}\nDigita *aiuto* per vedere tutti i comandi disponibili.`,
      };
  }
}

// ── Risoluzione conferma interattiva (utente ha risposto con un numero) ───────

async function resolveConfirmation(
  pending: PendingConfirmation,
  choiceIndex: number,
  pubId: number,
  tap: Awaited<ReturnType<typeof getPubTaplist>>
): Promise<CommandResult> {
  const chosen = pending.candidates[choiceIndex];
  if (!chosen) {
    return { ok: false, message: `❌ Numero non valido. Scegli tra 1 e ${pending.candidates.length}.` };
  }

  // Ricrea l'azione con il candidato scelto incorporato
  const action = pending.originalAction;

  if (action.type === "add") {
    const already = tap.find(i => i.beerId === chosen.id);
    if (already) return { ok: true, message: `ℹ️ *${chosen.name}* è già in spillatura.` };
    await db.insert(tapList).values({ pubId, beerId: chosen.id, isActive: true, isVisible: true });
    const brewInfo = chosen.breweryName ? ` di *${chosen.breweryName}*` : "";
    return { ok: true, message: `✅ *${chosen.name}*${brewInfo} aggiunta alla spillatura.` };
  }

  if (action.type === "swap") {
    const fromItem = fuzzyFind(action.from, tap);
    if (!fromItem) return { ok: false, message: `❌ Birra da sostituire non trovata: "${action.from}"` };
    await db.update(tapList).set({ beerId: chosen.id }).where(eq(tapList.id, fromItem.id));
    const brewInfo = chosen.breweryName ? ` di *${chosen.breweryName}*` : "";
    return { ok: true, message: `🔄 *${fromItem.beerName}* sostituita con *${chosen.name}*${brewInfo} (prezzi mantenuti).` };
  }

  return { ok: false, message: "❌ Azione non riconosciuta nella conferma." };
}

// ── Processo messaggio completo ───────────────────────────────────────────────

export async function processBotMessage(chatId: string, platform: string, text: string): Promise<string> {
  const [conn] = await db
    .select()
    .from(botConnections)
    .where(and(
      eq(botConnections.platform, platform),
      eq(botConnections.chatId, chatId),
      eq(botConnections.isActive, true)
    ));

  if (!conn) {
    return "⚠️ Account non collegato. Vai su Fermenta.to → Dashboard → Bot Manager e segui le istruzioni.";
  }

  if (text.trim().toLowerCase().startsWith("/start")) {
    return "✅ Sei già collegato! Digita *aiuto* per vedere i comandi disponibili.";
  }

  const tap = await getPubTaplist(conn.pubId);

  // ── Gestione risposta numerica a una scelta pendente ──────────────────────
  const trimmed = text.trim();
  const numMatch = /^(\d+)$/.test(trimmed);
  if (numMatch && conn.pendingAction) {
    const pending = conn.pendingAction as PendingConfirmation;
    const idx = parseInt(trimmed, 10) - 1;
    const result = await resolveConfirmation(pending, idx, conn.pubId, tap);
    // Cancella il pending indipendentemente dal risultato
    await db.update(botConnections)
      .set({ pendingAction: null })
      .where(eq(botConnections.id, conn.id));
    return result.message;
  }

  // ── Se arriva un comando normale, annulla eventuale pending esistente ─────
  if (conn.pendingAction && !numMatch) {
    await db.update(botConnections)
      .set({ pendingAction: null })
      .where(eq(botConnections.id, conn.id));
  }

  // ── Processo normale ──────────────────────────────────────────────────────
  const context = buildTaplistContext(tap);
  const action = await parseCommand(text, context);
  const result = await executeResolved(action, conn.pubId, tap);

  if (result.ok === "choose") {
    // Salva il pending e chiedi all'utente
    await db.update(botConnections)
      .set({ pendingAction: result.pending as any })
      .where(eq(botConnections.id, conn.id));
  }

  return result.message;
}

// ── Gestione token di collegamento ───────────────────────────────────────────

export async function linkBotAccount(
  token: string,
  chatId: string,
  platform: string,
  displayName: string
): Promise<{ ok: boolean; pubName?: string; message: string }> {
  const [tokenRow] = await db
    .select()
    .from(botLinkTokens)
    .where(eq(botLinkTokens.token, token));

  if (!tokenRow) return { ok: false, message: "Token non valido." };
  if (tokenRow.usedAt) return { ok: false, message: "Token già utilizzato." };
  if (new Date() > tokenRow.expiresAt) return { ok: false, message: "Token scaduto. Generane uno nuovo dal dashboard." };

  await db.update(botLinkTokens).set({ usedAt: new Date() }).where(eq(botLinkTokens.token, token));

  const existing = await db
    .select()
    .from(botConnections)
    .where(and(eq(botConnections.platform, platform), eq(botConnections.chatId, chatId)));

  if (existing.length > 0) {
    await db
      .update(botConnections)
      .set({ userId: tokenRow.userId, pubId: tokenRow.pubId, displayName, isActive: true })
      .where(eq(botConnections.id, existing[0].id));
  } else {
    await db.insert(botConnections).values({
      userId: tokenRow.userId,
      pubId: tokenRow.pubId,
      platform,
      chatId,
      displayName,
      isActive: true,
    });
  }

  const [pub] = await db.select({ name: pubs.name }).from(pubs).where(eq(pubs.id, tokenRow.pubId));
  return { ok: true, pubName: pub?.name, message: `Collegato al pub "${pub?.name ?? ""}".` };
}

export function generateLinkToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
