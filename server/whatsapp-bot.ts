/**
 * WhatsApp Bot — webhook handler per Meta Cloud API.
 * Richiede: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 *
 * Per configurare:
 * 1. Crea un'app su developers.facebook.com con il prodotto "WhatsApp"
 * 2. Aggiungi un numero Business e ottieni il Phone Number ID
 * 3. Imposta WHATSAPP_VERIFY_TOKEN con un valore casuale sicuro
 * 4. Registra il webhook URL: https://TUO_DOMINIO/api/bot/whatsapp/webhook
 * 5. Iscriviti all'evento "messages"
 */
import type { Request, Response } from "express";
import crypto from "crypto";
import { processBotMessage, linkBotAccount } from "./bot-commands";

const WA_TOKEN = () => process.env.WHATSAPP_TOKEN ?? "";
const WA_PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const WA_VERIFY_TOKEN = () => process.env.WHATSAPP_VERIFY_TOKEN ?? "fermenta_bot_verify";
const WA_APP_SECRET = () => process.env.WHATSAPP_APP_SECRET ?? "";

// ── Invia un messaggio WhatsApp ───────────────────────────────────────────────
export async function sendWhatsApp(to: string, text: string): Promise<void> {
  const token = WA_TOKEN();
  const phoneId = WA_PHONE_ID();
  if (!token || !phoneId) return;

  // Converte Markdown semplice in testo plain (WhatsApp non supporta Markdown di Telegram)
  const plain = text.replace(/\*/g, "").replace(/_/g, "");

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: plain },
    }),
  }).catch(() => {});
}

// ── Verifica firma HMAC ───────────────────────────────────────────────────────
function verifySignature(rawBody: Buffer, signature: string): boolean {
  const secret = WA_APP_SECRET();
  if (!secret) return true; // Salta verifica se non configurato
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── GET — verifica webhook Meta ───────────────────────────────────────────────
export function handleWhatsAppVerify(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WA_VERIFY_TOKEN()) {
    console.log("[whatsapp] Webhook verificato");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Token non valido" });
  }
}

// ── POST — riceve messaggi WhatsApp ──────────────────────────────────────────
export async function handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
  // Verifica firma (il body è raw Buffer grazie al middleware in index.ts)
  const signature = req.headers["x-hub-signature-256"] as string ?? "";
  const rawBody = req.body as Buffer;

  if (signature && !verifySignature(rawBody, signature)) {
    res.status(403).json({ error: "Firma non valida" });
    return;
  }

  res.status(200).json({ received: true }); // Risposta immediata a Meta

  try {
    const data = JSON.parse(rawBody.toString("utf8"));
    const entry = data?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!Array.isArray(messages) || !messages.length) return;

    for (const msg of messages) {
      const from = msg.from as string; // Numero di telefono mittente (es. "393331234567")
      const text = (msg.text?.body ?? "").trim();
      if (!text || !from) continue;

      // Gestione token di collegamento (il primo messaggio contiene il token)
      if (/^[0-9a-f]{48}$/i.test(text)) {
        const displayName = value?.contacts?.[0]?.profile?.name ?? from;
        const result = await linkBotAccount(text, from, "whatsapp", displayName);
        if (result.ok) {
          await sendWhatsApp(from,
            `✅ Collegato con successo!\n\nGestisci il menu di ${result.pubName} da qui.\nDigita "aiuto" per vedere i comandi disponibili.`
          );
        } else {
          await sendWhatsApp(from, `❌ ${result.message}\n\nVai su Fermenta.to → Dashboard → Configura Bot per generare un nuovo codice.`);
        }
        continue;
      }

      const reply = await processBotMessage(from, "whatsapp", text);
      await sendWhatsApp(from, reply);
    }
  } catch (e) {
    console.error("[whatsapp] Errore webhook:", e);
  }
}
