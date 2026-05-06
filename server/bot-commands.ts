/**
 * Bot Commands — parser Gemini + esecutore per Telegram e WhatsApp.
 * Gestisce il menu/taplist di un pub via messaggi in linguaggio naturale.
 */
import { db } from "./db";
import { tapList, beers, botConnections, botLinkTokens, pubs } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import crypto from "crypto";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Tipi azioni ──────────────────────────────────────────────────────────────

export type BotAction =
  | { type: "swap"; from: string; to: string }
  | { type: "hide"; beer: string }
  | { type: "show"; beer: string }
  | { type: "remove"; beer: string }
  | { type: "add"; beer: string }
  | { type: "price"; beer: string; prices: Record<string, number> }
  | { type: "list" }
  | { type: "help" }
  | { type: "unknown"; reason: string };

// ── Parser Gemini ─────────────────────────────────────────────────────────────

export async function parseCommand(message: string, taplistContext: string): Promise<BotAction> {
  const key = GEMINI_API_KEY();
  if (!key) return { type: "unknown", reason: "Gemini non configurato" };

  const prompt = `Sei l'assistente di gestione menu per un pub italiano su Fermenta.to.
Il titolare del pub ti ha inviato questo messaggio. Analizza il comando e restituisci UN'azione in JSON.

Birre attualmente nel menu del pub (taplist):
${taplistContext || "(menu vuoto)"}

Messaggio del titolare: "${message}"

Rispondi SOLO con un JSON valido (nessun testo aggiuntivo), scegliendo tra:

Cambiare/sostituire una birra (mantieni i prezzi):
{"type":"swap","from":"NOME_BIRRA_ATTUALE","to":"NUOVA_BIRRA_DA_CERCARE"}

Nascondere temporaneamente (isVisible=false):
{"type":"hide","beer":"NOME_BIRRA"}

Riabilitare una birra nascosta (isVisible=true):
{"type":"show","beer":"NOME_BIRRA"}

Rimuovere definitivamente dal menu:
{"type":"remove","beer":"NOME_BIRRA"}

Aggiungere una birra al menu (cerca nel catalogo):
{"type":"add","beer":"NOME_BIRRA"}

Aggiornare prezzo (solo valori cambiati):
{"type":"price","beer":"NOME_BIRRA","prices":{"piccola":3.50,"media":5.00}}

Vedere la lista attuale:
{"type":"list"}

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
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
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
      isVisible: tapList.isVisible,
      isActive: tapList.isActive,
      priceSmall: tapList.priceSmall,
      priceMedium: tapList.priceMedium,
      priceLarge: tapList.priceLarge,
      prices: tapList.prices,
    })
    .from(tapList)
    .leftJoin(beers, eq(tapList.beerId, beers.id))
    .where(and(eq(tapList.pubId, pubId), eq(tapList.isActive, true)));
}

function buildTaplistContext(items: Awaited<ReturnType<typeof getPubTaplistWithBeerNames>>) {
  if (!items.length) return "(menu vuoto)";
  return items
    .map(i => `- ${i.beerName}${i.beerStyle ? ` (${i.beerStyle})` : ""}${!i.isVisible ? " [NASCOSTA]" : ""}`)
    .join("\n");
}

function fuzzyFind(name: string, items: { beerName: string | null }[]) {
  const q = name.toLowerCase().trim();
  return items.find(i => i.beerName?.toLowerCase().includes(q) || q.includes((i.beerName ?? "").toLowerCase()));
}

// ── Esecutore comandi ─────────────────────────────────────────────────────────

export type CommandResult = { ok: boolean; message: string };

export async function executeCommand(action: BotAction, pubId: number): Promise<CommandResult> {
  const tap = await getPubTaplistWithBeerNames(pubId);

  switch (action.type) {
    case "list": {
      if (!tap.length) return { ok: true, message: "📋 Il menu è vuoto." };
      const lines = tap.map(i =>
        `${i.isVisible ? "✅" : "🙈"} *${i.beerName}*${i.beerStyle ? ` — ${i.beerStyle}` : ""}`
      );
      return { ok: true, message: `📋 *Menu attuale:*\n${lines.join("\n")}` };
    }

    case "help": {
      return {
        ok: true,
        message: `🤖 *Comandi disponibili:*
• *cambia* Birra A *con* Birra B — sostituisce mantenendo i prezzi
• *nascondi* Nome Birra — nasconde temporaneamente
• *mostra* Nome Birra — riabilita birra nascosta
• *rimuovi* Nome Birra — elimina dal menu
• *aggiungi* Nome Birra — cerca e aggiunge al catalogo
• *prezzo* Nome: piccola 3.5 media 5.0 — aggiorna prezzi
• *menu* — vedi il menu attuale
• *aiuto* — mostra questo messaggio`,
      };
    }

    case "hide": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata nel menu: "${action.beer}"` };
      await db.update(tapList).set({ isVisible: false }).where(eq(tapList.id, item.id));
      return { ok: true, message: `🙈 *${item.beerName}* nascosta dal menu.` };
    }

    case "show": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata nel menu: "${action.beer}"` };
      await db.update(tapList).set({ isVisible: true }).where(eq(tapList.id, item.id));
      return { ok: true, message: `✅ *${item.beerName}* riabilitata nel menu.` };
    }

    case "remove": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata nel menu: "${action.beer}"` };
      await db.delete(tapList).where(eq(tapList.id, item.id));
      return { ok: true, message: `🗑️ *${item.beerName}* rimossa definitivamente dal menu.` };
    }

    case "add": {
      const [found] = await db
        .select({ id: beers.id, name: beers.name })
        .from(beers)
        .where(ilike(beers.name, `%${action.beer}%`))
        .limit(1);
      if (!found) return { ok: false, message: `❌ Nessuna birra trovata con il nome "${action.beer}" nel catalogo.` };
      const already = tap.find(i => i.beerId === found.id);
      if (already) return { ok: true, message: `ℹ️ *${found.name}* è già nel menu.` };
      await db.insert(tapList).values({ pubId, beerId: found.id, isActive: true, isVisible: true });
      return { ok: true, message: `✅ *${found.name}* aggiunta al menu.` };
    }

    case "swap": {
      const item = fuzzyFind(action.from, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata nel menu: "${action.from}"` };
      const [newBeer] = await db
        .select({ id: beers.id, name: beers.name })
        .from(beers)
        .where(ilike(beers.name, `%${action.to}%`))
        .limit(1);
      if (!newBeer) return { ok: false, message: `❌ Nuova birra non trovata nel catalogo: "${action.to}"` };
      await db.update(tapList).set({ beerId: newBeer.id }).where(eq(tapList.id, item.id));
      return { ok: true, message: `🔄 *${item.beerName}* sostituita con *${newBeer.name}* (prezzi mantenuti).` };
    }

    case "price": {
      const item = fuzzyFind(action.beer, tap);
      if (!item) return { ok: false, message: `❌ Birra non trovata nel menu: "${action.beer}"` };
      const updates: Record<string, unknown> = {};
      if (action.prices.piccola != null) updates.priceSmall = String(action.prices.piccola);
      if (action.prices.media != null) updates.priceMedium = String(action.prices.media);
      if (action.prices.grande != null) updates.priceLarge = String(action.prices.grande);
      if (Object.keys(action.prices).some(k => !["piccola","media","grande"].includes(k))) {
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
  // Trova la connessione
  const [conn] = await db
    .select()
    .from(botConnections)
    .where(and(eq(botConnections.platform, platform), eq(botConnections.chatId, chatId), eq(botConnections.isActive, true)));

  if (!conn) {
    return "⚠️ Account non collegato. Vai su Fermenta.to → Dashboard → Impostazioni → Configura Bot e segui le istruzioni.";
  }

  // Gestione token di collegamento (messaggio "/start TOKEN")
  // Non si arriva qui se non già collegati, ma per sicurezza:
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

  // Marca il token come usato
  await db.update(botLinkTokens).set({ usedAt: new Date() }).where(eq(botLinkTokens.token, token));

  // Inserisci o aggiorna la connessione (upsert)
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
