/**
 * Telegram Bot — webhook handler per Fermenta.to Bot Manager.
 * Registra il webhook all'avvio se TELEGRAM_BOT_TOKEN è configurato.
 */
import type { Request, Response } from "express";
import { processBotMessage, linkBotAccount } from "./bot-commands";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
const API = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN()}/${method}`;

// ── Invia un messaggio Telegram ───────────────────────────────────────────────
export async function sendTelegram(chatId: string | number, text: string): Promise<void> {
  const token = BOT_TOKEN();
  if (!token) return;
  await fetch(API("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch(() => {});
}

// ── Registra il webhook su Telegram ──────────────────────────────────────────
export async function registerTelegramWebhook(baseUrl: string): Promise<void> {
  const token = BOT_TOKEN();
  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN non configurato — bot disabilitato");
    return;
  }
  const webhookUrl = `${baseUrl}/api/bot/telegram/webhook`;
  const resp = await fetch(API("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
  });
  const data = await resp.json();
  if (data.ok) {
    console.log(`[telegram] Webhook registrato: ${webhookUrl}`);
  } else {
    console.error("[telegram] Errore registrazione webhook:", data.description);
  }
}

// ── Handler webhook ───────────────────────────────────────────────────────────
export async function handleTelegramWebhook(req: Request, res: Response): Promise<void> {
  res.status(200).json({ ok: true }); // Risposta immediata a Telegram

  try {
    const update = req.body;
    const message = update?.message;
    if (!message) return;

    const chatId = String(message.chat?.id ?? "");
    const text = (message.text ?? "").trim();
    const firstName = message.from?.first_name ?? "";
    const username = message.from?.username ?? "";
    const displayName = username ? `@${username}` : firstName;

    if (!text || !chatId) return;

    // Gestione /start TOKEN
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1]?.trim();
      if (token && token.length > 10) {
        const result = await linkBotAccount(token, chatId, "telegram", displayName);
        if (result.ok) {
          await sendTelegram(chatId,
            `✅ *Collegato con successo!*\n\nGestisci il menu di *${result.pubName}* da qui.\nDigita *aiuto* per vedere i comandi disponibili.`
          );
        } else {
          await sendTelegram(chatId, `❌ ${result.message}\n\nVai su Fermenta.to → Dashboard → Configura Bot per generare un nuovo codice.`);
        }
        return;
      }
      await sendTelegram(chatId,
        `👋 Ciao ${firstName}! Sono il bot di *Fermenta.to*.\n\nPer collegare il tuo pub, vai su Fermenta.to → Dashboard → Configura Bot e segui le istruzioni.`
      );
      return;
    }

    // Processo comando normale
    const reply = await processBotMessage(chatId, "telegram", text);
    await sendTelegram(chatId, reply);
  } catch (e) {
    console.error("[telegram] Errore webhook:", e);
  }
}
