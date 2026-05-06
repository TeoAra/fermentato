/**
 * Bot Commands — parser Gemini + esecutore per Telegram e WhatsApp.
 * Gestisce taplist e menu cibo di un pub via messaggi in italiano naturale.
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

// ── Tipi azioni ──────────────────────────────────────────────────────────────

export type BotAction =
  // ── Taplist (birre) ──
  | { type: "swap"; from: string; to: string; brewery?: string }
  | { type: "hide"; beer: string }
  | { type: "show"; beer: string }
  | { type: "remove"; beer: string }
  | { type: "add"; beer: string; brewery?: string }
  | { type: "price"; beer: string; prices: Record<string, number> }
  | { type: "taplist" }
  // ── Menu cibo — prodotti ──
  | { type: "item_hide"; item: string }
  | { type: "item_show"; item: string }
  | { type: "item_unavailable"; item: string }
  | { type: "item_available"; item: string }
  | { type: "item_price"; item: string; price: number }
  | { type: "item_remove"; item: string }
  | { type: "item_rename"; item: string; newName: string }
  | { type: "ingredient_remove"; ingredient: string; items: "all" | string[] }
  | { type: "ingredient_add"; ingredient: string; items: string[] }
  // ── Menu cibo — categorie ──
  | { type: "category_hide"; category: string }
  | { type: "category_show"; category: string }
  // ── Generali ──
  | { type: "menu" }
  | { type: "help" }
  | { type: "unknown"; reason: string };

// ── Parser Gemini ─────────────────────────────────────────────────────────────

export async function parseCommand(message: string, taplistContext: string): Promise<BotAction> {
  const key = GEMINI_API_KEY();
  if (!key) return { type: "unknown", reason: "Gemini non configurato" };

  const prompt = `Sei l'assistente di gestione menu per un pub italiano su Fermenta.to.
Il titolare ti ha inviato questo messaggio. Analizza il comando e restituisci UN'azione in JSON.

Birre attualmente in spillatura:
${taplistContext || "(nessuna birra in spina)"}

Messaggio: "${message}"

Rispondi SOLO con un JSON valido (nessun testo aggiuntivo):

━━ SPILLATURA (BIRRE) ━━

Sostituire una birra in spina (i prezzi rimangono):
{"type":"swap","from":"BIRRA_ATTUALE","to":"NUOVA_BIRRA","brewery":"BIRRIFICIO_OPZIONALE"}

Nascondere/mostrare una birra dalla spillatura:
{"type":"hide","beer":"NOME"} oppure {"type":"show","beer":"NOME"}

Rimuovere/aggiungere una birra dalla spillatura:
{"type":"remove","beer":"NOME"} oppure {"type":"add","beer":"NOME","brewery":"BIRRIFICIO_OPZIONALE"}

Aggiornare prezzo birra (piccola/media/grande):
{"type":"price","beer":"NOME","prices":{"piccola":3.50,"media":5.00}}

Vedere le birre in spillatura:
{"type":"taplist"}

━━ MENU CIBO — PRODOTTI ━━

Nascondere un prodotto dal menu (non visibile ai clienti):
{"type":"item_hide","item":"NOME_PRODOTTO"}

Rendere di nuovo visibile un prodotto nascosto:
{"type":"item_show","item":"NOME_PRODOTTO"}

Segnare un prodotto come esaurito/non disponibile (visibile ma non ordinabile):
{"type":"item_unavailable","item":"NOME_PRODOTTO"}

Segnare un prodotto come di nuovo disponibile:
{"type":"item_available","item":"NOME_PRODOTTO"}

Cambiare il prezzo di un prodotto:
{"type":"item_price","item":"NOME_PRODOTTO","price":12.50}

Rimuovere definitivamente un prodotto dal menu:
{"type":"item_remove","item":"NOME_PRODOTTO"}

Rinominare un prodotto:
{"type":"item_rename","item":"NOME_ATTUALE","newName":"NUOVO_NOME"}

Aggiungere un ingrediente alla descrizione di prodotti specifici:
{"type":"ingredient_add","ingredient":"INGREDIENTE","items":["PRODOTTO 1","PRODOTTO 2"]}

Rimuovere un ingrediente da TUTTI i prodotti che lo contengono:
{"type":"ingredient_remove","ingredient":"INGREDIENTE","items":"all"}

Rimuovere un ingrediente da prodotti specifici:
{"type":"ingredient_remove","ingredient":"INGREDIENTE","items":["PRODOTTO 1","PRODOTTO 2"]}

━━ MENU CIBO — CATEGORIE ━━

Nascondere un'intera categoria (es. "Chiudiamo i dolci"):
{"type":"category_hide","category":"NOME_CATEGORIA"}

Rendere di nuovo visibile una categoria:
{"type":"category_show","category":"NOME_CATEGORIA"}

━━ GENERALI ━━

Vedere il menu cibo completo ("menu", "carta", ecc.):
{"type":"menu"}

Chiedere aiuto:
{"type":"help"}

Non capisci:
{"type":"unknown","reason":"MOTIVO_BREVE"}`;

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
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as BotAction;
  } catch (e) {
    return { type: "unknown", reason: "Errore nel parsing del comando" };
  }
}

// ── Helpers taplist ───────────────────────────────────────────────────────────

async function getPubTaplistWithBeerNames(pubId: number) {
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

function buildTaplistContext(items: Awaited<ReturnType<typeof getPubTaplistWithBeerNames>>) {
  if (!items.length) return "(nessuna birra in spina)";
  return items
    .map(i =>
      `- ${i.beerName}${i.breweryName ? ` di ${i.breweryName}` : ""}${i.beerStyle ? ` (${i.beerStyle})` : ""}${!i.isVisible ? " [NASCOSTA]" : ""}`
    )
    .join("\n");
}

function fuzzyFind(name: string, items: { beerName: string | null }[]) {
  const q = name.toLowerCase().trim();
  return items.find(i =>
    i.beerName?.toLowerCase().includes(q) ||
    q.includes((i.beerName ?? "").toLowerCase())
  );
}

// Cerca una birra nel catalogo per nome (+ birrificio opzionale)
async function findBeerInCatalog(beerName: string, brewery?: string) {
  const rows = await db
    .select({ id: beers.id, name: beers.name, breweryName: breweries.name })
    .from(beers)
    .leftJoin(breweries, eq(beers.breweryId, breweries.id))
    .where(ilike(beers.name, `%${beerName}%`));

  if (!rows.length) return null;

  if (brewery) {
    const bq = brewery.toLowerCase().trim();
    const match = rows.find(r => r.breweryName?.toLowerCase().includes(bq));
    if (match) return match;
    return { ...rows[0], breweryMismatch: true };
  }

  return rows[0];
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
  const q = name.toLowerCase().trim();
  return items.find(i =>
    i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase())
  );
}

async function getPubCategories(pubId: number) {
  return db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.pubId, pubId))
    .orderBy(asc(menuCategories.orderIndex));
}

function fuzzyFindCategory(name: string, cats: { name: string }[]) {
  const q = name.toLowerCase().trim();
  return cats.find(c =>
    c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())
  );
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

// ── Esecutore comandi ─────────────────────────────────────────────────────────

export type CommandResult = { ok: boolean; message: string };

export async function executeCommand(action: BotAction, pubId: number): Promise<CommandResult> {
  const tap = await getPubTaplistWithBeerNames(pubId);

  switch (action.type) {

    // ─── GENERALI ──────────────────────────────────────────────────────────────

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

    case "help": {
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
• *nascondi* Burger — togli dalla vista clienti
• *mostra* Burger — rimetti visibile
• *esaurito* Burger — visibile ma non ordinabile
• *disponibile* Burger — torna ordinabile
• *prezzo* Burger *a* 12.50€
• *rinomina* Burger *in* Smash Burger
• *rimuovi* Burger — elimina definitivamente
• *togli* cipolle *da tutti i prodotti*
• *togli* pancetta *da* Burger, Club Sandwich
• *aggiungi* rucola *a* Tagliere, Bruschetta

📂 *Categorie:*
• *nascondi categoria* Dolci
• *mostra categoria* Dolci

• *menu* — vedi menu completo
• *aiuto* — mostra questo messaggio`,
      };
    }

    // ─── TAPLIST (BIRRE) ───────────────────────────────────────────────────────

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
      const found = await findBeerInCatalog(action.beer, action.brewery);
      if (!found) {
        const hint = action.brewery
          ? `Nessuna birra "${action.beer}" di "${action.brewery}" trovata nel catalogo.`
          : `Nessuna birra "${action.beer}" trovata. Riprova specificando anche il birrificio: _aggiungi NomeBirra di NomeBirrificio_`;
        return { ok: false, message: `❌ ${hint}` };
      }
      const already = tap.find(i => i.beerId === found.id);
      if (already) return { ok: true, message: `ℹ️ *${found.name}* è già in spillatura.` };
      await db.insert(tapList).values({ pubId, beerId: found.id, isActive: true, isVisible: true });
      const brewInfo = found.breweryName ? ` di *${found.breweryName}*` : "";
      return { ok: true, message: `✅ *${found.name}*${brewInfo} aggiunta alla spillatura.` };
    }

    case "swap": {
      const item = fuzzyFind(action.from, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata in spillatura: "${action.from}"` };
      const newBeer = await findBeerInCatalog(action.to, action.brewery);
      if (!newBeer) {
        const hint = action.brewery
          ? `Nessuna birra "${action.to}" di "${action.brewery}" trovata nel catalogo.`
          : `Nessuna birra "${action.to}" trovata. Riprova specificando il birrificio: _cambia X con Y di Birrificio_`;
        return { ok: false, message: `❌ ${hint}` };
      }
      await db.update(tapList).set({ beerId: newBeer.id }).where(eq(tapList.id, item.id));
      const brewInfo = newBeer.breweryName ? ` di *${newBeer.breweryName}*` : "";
      return { ok: true, message: `🔄 *${item.beerName}* sostituita con *${newBeer.name}*${brewInfo} (prezzi mantenuti).` };
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

    // ─── PRODOTTI MENU CIBO ────────────────────────────────────────────────────

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
      const newPrice = String(action.price.toFixed(2));
      const oldPrice = found.price ? ` (era €${parseFloat(found.price).toFixed(2)})` : "";
      await db.update(menuItems).set({ price: newPrice }).where(eq(menuItems.id, found.id));
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

    // ─── INGREDIENTI ───────────────────────────────────────────────────────────

    case "ingredient_remove": {
      const allItems = await getAllFoodItems(pubId);
      const ing = action.ingredient.toLowerCase().trim();

      let targets: typeof allItems;
      if (action.items === "all") {
        targets = allItems.filter(i =>
          i.name?.toLowerCase().includes(ing) ||
          i.description?.toLowerCase().includes(ing)
        );
      } else {
        targets = allItems.filter(item =>
          (action.items as string[]).some(q =>
            item.name?.toLowerCase().includes(q.toLowerCase().trim())
          )
        );
      }

      if (!targets.length) {
        return { ok: false, message: `❌ Nessun prodotto contiene "${action.ingredient}".` };
      }

      const re = new RegExp(
        `(,\\s*|\\s+con\\s+|\\s+e\\s+|\\s+)?${action.ingredient.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s*,|\\s+e\\s+|\\s+con\\s+)?`,
        "gi"
      );

      const updated: string[] = [];
      for (const item of targets) {
        const newDesc = (item.description ?? "").replace(re, " ").replace(/\s{2,}/g, " ").trim();
        const newName = item.name.replace(re, " ").replace(/\s{2,}/g, " ").trim();
        await db.update(menuItems)
          .set({ description: newDesc || null, name: newName })
          .where(eq(menuItems.id, item.id));
        updated.push(item.name);
      }

      return {
        ok: true,
        message: `✅ *"${action.ingredient}"* rimosso da ${updated.length} prodott${updated.length === 1 ? "o" : "i"}:\n${updated.map(n => `• ${n}`).join("\n")}`,
      };
    }

    case "ingredient_add": {
      const allItems = await getAllFoodItems(pubId);

      const targets = allItems.filter(item =>
        action.items.some(q =>
          item.name?.toLowerCase().includes(q.toLowerCase().trim())
        )
      );

      if (!targets.length) {
        return { ok: false, message: `❌ Nessun prodotto trovato tra: ${action.items.join(", ")}` };
      }

      const updated: string[] = [];
      for (const item of targets) {
        const already = (item.description ?? "").toLowerCase().includes(action.ingredient.toLowerCase());
        if (already) { updated.push(`${item.name} (già presente)`); continue; }
        const newDesc = item.description
          ? `${item.description}, ${action.ingredient}`
          : action.ingredient;
        await db.update(menuItems).set({ description: newDesc }).where(eq(menuItems.id, item.id));
        updated.push(item.name);
      }

      return {
        ok: true,
        message: `✅ *"${action.ingredient}"* aggiunto a ${targets.length} prodott${targets.length === 1 ? "o" : "i"}:\n${updated.map(n => `• ${n}`).join("\n")}`,
      };
    }

    // ─── CATEGORIE ─────────────────────────────────────────────────────────────

    case "category_hide": {
      const cats = await getPubCategories(pubId);
      const cat = fuzzyFindCategory(action.category, cats);
      if (!cat) return { ok: false, message: `❌ Categoria non trovata: "${action.category}"` };
      await db.update(menuCategories).set({ isVisible: false }).where(eq(menuCategories.id, cat.id));
      return { ok: true, message: `🙈 Categoria *${cat.name}* nascosta (i prodotti restano ma non sono visibili ai clienti).` };
    }

    case "category_show": {
      const cats = await getPubCategories(pubId);
      const cat = fuzzyFindCategory(action.category, cats);
      if (!cat) return { ok: false, message: `❌ Categoria non trovata: "${action.category}"` };
      await db.update(menuCategories).set({ isVisible: true }).where(eq(menuCategories.id, cat.id));
      return { ok: true, message: `✅ Categoria *${cat.name}* di nuovo visibile nel menu.` };
    }

    // ─── DEFAULT ────────────────────────────────────────────────────────────────

    case "unknown":
    default:
      return {
        ok: false,
        message: `🤷 Non ho capito il comando. ${(action as any).reason ?? ""}\nDigita *aiuto* per vedere tutti i comandi disponibili.`,
      };
  }
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

  const tap = await getPubTaplistWithBeerNames(conn.pubId);
  const context = buildTaplistContext(tap);
  const action = await parseCommand(text, context);
  const result = await executeCommand(action, conn.pubId);
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
