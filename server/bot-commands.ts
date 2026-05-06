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
  | { type: "swap"; from: string; to: string; brewery?: string }
  | { type: "hide"; beer: string }
  | { type: "show"; beer: string }
  | { type: "remove"; beer: string }
  | { type: "add"; beer: string; brewery?: string }
  | { type: "price"; beer: string; prices: Record<string, number> }
  | { type: "taplist" }   // birre in spillatura
  | { type: "menu" }      // menu cibo con categorie e piatti
  | { type: "help" }
  | { type: "unknown"; reason: string };

// ── Parser Gemini ─────────────────────────────────────────────────────────────

export async function parseCommand(message: string, taplistContext: string): Promise<BotAction> {
  const key = GEMINI_API_KEY();
  if (!key) return { type: "unknown", reason: "Gemini non configurato" };

  const prompt = `Sei l'assistente di gestione menu per un pub italiano su Fermenta.to.
Il titolare del pub ti ha inviato questo messaggio. Analizza il comando e restituisci UN'azione in JSON.

Birre attualmente in spillatura (taplist):
${taplistContext || "(nessuna birra in spina)"}

Messaggio del titolare: "${message}"

Rispondi SOLO con un JSON valido (nessun testo aggiuntivo), scegliendo tra:

Cambiare/sostituire una birra in spina (mantieni i prezzi).
Includi brewery se il titolare specifica il birrificio della NUOVA birra:
{"type":"swap","from":"NOME_BIRRA_ATTUALE","to":"NUOVA_BIRRA","brewery":"BIRRIFICIO_OPZIONALE"}

Nascondere temporaneamente dalla spillatura (isVisible=false):
{"type":"hide","beer":"NOME_BIRRA"}

Riabilitare una birra nascosta (isVisible=true):
{"type":"show","beer":"NOME_BIRRA"}

Rimuovere definitivamente dalla spillatura:
{"type":"remove","beer":"NOME_BIRRA"}

Aggiungere una birra alla spillatura (cerca nel catalogo).
Includi brewery se specificato — aiuta molto a trovare la birra giusta:
{"type":"add","beer":"NOME_BIRRA","brewery":"BIRRIFICIO_OPZIONALE"}

Aggiornare prezzo (solo valori forniti):
{"type":"price","beer":"NOME_BIRRA","prices":{"piccola":3.50,"media":5.00}}

Vedere le birre in spillatura ("birre", "taplist", "cosa ho in spina", ecc.):
{"type":"taplist"}

Vedere il menu cibo con categorie e piatti ("menu", "carta", "cosa mangiamo", ecc.):
{"type":"menu"}

Chiedere aiuto:
{"type":"help"}

Se non capisci:
{"type":"unknown","reason":"MOTIVO_BREVE"}`;

  try {
    const resp = await fetch(`${GEMINI_API_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
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

  // Se il birrificio è specificato, filtra per quel birrificio
  if (brewery) {
    const bq = brewery.toLowerCase().trim();
    const match = rows.find(r => r.breweryName?.toLowerCase().includes(bq));
    if (match) return match;
    // Fallback: ritorna il primo risultato ma con avviso
    return { ...rows[0], breweryMismatch: true };
  }

  return rows[0];
}

// ── Helpers menu cibo ─────────────────────────────────────────────────────────

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

  // Raggruppa per categoria
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
      lines.push(`  • ${item.name}${price}${flags ? " " + flags : ""}`);
    }
  }
  return lines.join("\n");
}

// ── Esecutore comandi ─────────────────────────────────────────────────────────

export type CommandResult = { ok: boolean; message: string };

export async function executeCommand(action: BotAction, pubId: number): Promise<CommandResult> {
  const tap = await getPubTaplistWithBeerNames(pubId);

  switch (action.type) {

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
• *cambia* Birra A *con* Birra B (di Birrificio) — sostituisce mantenendo i prezzi
• *nascondi* Nome Birra — nasconde temporaneamente
• *mostra* Nome Birra — riabilita birra nascosta
• *rimuovi* Nome Birra — elimina dalla spillatura
• *aggiungi* Nome Birra (di Birrificio) — cerca e aggiunge
• *prezzo* Nome: piccola 3.5 media 5.0 — aggiorna prezzi
• *birre* — vedi le birre in spillatura
• *menu* — vedi il menu cibo con categorie
• *aiuto* — mostra questo messaggio`,
      };
    }

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

    case "unknown":
    default:
      return {
        ok: false,
        message: `🤷 Non ho capito il comando. ${(action as any).reason ?? ""}\nDigita *aiuto* per vedere i comandi disponibili.`,
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
