import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@fermenta.to';

let vapidConfigured = false;

const PUSH_TTL = 3600;
const PUSH_URGENCY = 'normal' as const;

// Throttle anti-spam: stesso (userId,tag) entro 10s viene unificato.
const pushQueue: Map<string, { payload: any; timer: ReturnType<typeof setTimeout> }> = new Map();
const THROTTLE_MS = 10000;

// Batcher di aggregazione: raccoglie like/commenti per (userId,category,targetId)
// in una finestra di 10 minuti e li riassume in "N persone hanno..."
const BATCH_WINDOW_MS = 10 * 60 * 1000;
type BatchEntry = {
  count: number;
  firstActorName?: string;
  payload: any;
  timer: ReturnType<typeof setTimeout>;
};
const batchQueue: Map<string, BatchEntry> = new Map();

// Categorie note → colonna in notification_preferences
export type NotifCategory =
  | 'tapChanges' | 'events' | 'newPubs'
  | 'checkinLikes' | 'checkinComments'
  | 'newFollowers' | 'breweryReplies'
  | 'reportUpdates' | 'adminBroadcasts';

export function initVapid() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  }
  return false;
}

// Parse "HH:MM" → minuti dall'inizio della giornata
function parseHM(s?: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10), mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

// Calcola se ora corrente è in quiet hours; se sì, restituisce ms al termine.
// Supporta wrap mezzanotte (es 22:00 → 07:00).
export function quietWindowRemainingMs(start?: string | null, end?: string | null, now: Date = new Date()): number {
  const s = parseHM(start), e = parseHM(end);
  if (s == null || e == null || s === e) return 0;
  const cur = now.getHours() * 60 + now.getMinutes();
  const inWindow = s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
  if (!inWindow) return 0;
  let endMin = e;
  if (s >= e && cur >= s) endMin = e + 24 * 60;
  const minsLeft = endMin - cur;
  return Math.max(60_000, minsLeft * 60_000 - now.getSeconds() * 1000);
}

/**
 * Helper centrale: dato un utente e una categoria, decide se inviare la push.
 * Restituisce { allowed, deferMs } — se deferMs > 0 e mode='queue', il caller deve ritardare.
 */
/**
 * Helper email: dato un utente e una categoria, decide se inviare email.
 * Usato dai sender email (digest/transazionali) per rispettare il master
 * emailEnabled e il toggle <category>Email indipendente.
 */
export async function shouldSendEmailNotification(
  userId: string,
  category: NotifCategory | undefined,
): Promise<boolean> {
  try {
    const prefs = await storage.getNotificationPreferences(userId);
    if (!prefs) return true;
    if ((prefs as any).emailEnabled === false) return false;
    if (category && (prefs as any)[`${category}Email`] === false) return false;
    return true;
  } catch {
    return true;
  }
}

export async function shouldSendNotification(
  userId: string,
  category: NotifCategory | undefined,
): Promise<{ allowed: boolean; deferMs: number }> {
  try {
    const prefs = await storage.getNotificationPreferences(userId);
    if (!prefs) return { allowed: true, deferMs: 0 };
    if (prefs.pushEnabled === false) return { allowed: false, deferMs: 0 };
    // Canale push per categoria: <cat>Push (independente da inAppEnabled / <cat>)
    if (category && (prefs as any)[`${category}Push`] === false) return { allowed: false, deferMs: 0 };
    const remaining = quietWindowRemainingMs(prefs.quietHoursStart, prefs.quietHoursEnd);
    if (remaining > 0) {
      if (prefs.quietHoursMode === 'skip') return { allowed: false, deferMs: 0 };
      return { allowed: true, deferMs: remaining };
    }
    return { allowed: true, deferMs: 0 };
  } catch {
    return { allowed: true, deferMs: 0 };
  }
}

async function deliverPush(userId: string, payload: any) {
  const subs = await storage.getPushSubscriptionsByUser(userId);
  const sendPromises = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: PUSH_TTL, urgency: PUSH_URGENCY }
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await storage.deletePushSubscription(sub.endpoint);
      }
    }
  });
  await Promise.allSettled(sendPromises);
}

type PushPayload = {
  title: string; body: string;
  url?: string; type?: string; tag?: string;
  icon?: string; image?: string;
  category?: NotifCategory;
  // Aggregazione: se passati, i push successivi con stesso (userId,category,batchKey)
  // entro 10min vengono raggruppati in "N persone hanno..."
  batchKey?: string;          // es. `tasting:${id}` o `comment:${id}`
  batchActorName?: string;    // nome di chi ha generato l'evento
  batchTemplate?: (count: number, first?: string) => { title: string; body: string };
};

async function scheduleDelivery(userId: string, payload: PushPayload, deferMs: number) {
  const tag = payload.tag || `fermenta-${payload.type || payload.category || 'general'}`;
  const enriched = { ...payload, tag };
  delete (enriched as any).category;
  delete (enriched as any).batchKey;
  delete (enriched as any).batchActorName;
  delete (enriched as any).batchTemplate;

  // Se deferMs > 0 (quiet hours queue) → solo timeout; nessun coalescing
  if (deferMs > 0) {
    setTimeout(() => {
      deliverPush(userId, enriched).catch(e => console.error('[push] deferred error:', e));
    }, deferMs);
    return;
  }

  // Throttle 10s per (userId,tag) — l'ultimo payload vince
  const key = `${userId}:${tag}`;
  const existing = pushQueue.get(key);
  if (existing) { clearTimeout(existing.timer); pushQueue.delete(key); }
  const timer = setTimeout(async () => {
    pushQueue.delete(key);
    try { await deliverPush(userId, enriched); }
    catch (e) { console.error('[push] throttle error:', e); }
  }, THROTTLE_MS);
  pushQueue.set(key, { payload: enriched, timer });
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidConfigured) return;
  try {
    const { allowed, deferMs } = await shouldSendNotification(userId, payload.category);
    if (!allowed) return;

    // Aggregazione: se batchKey presente, BUFFERIZZA tutti gli eventi
    // nella finestra (10min) e a fine finestra invia UN solo push:
    // - count == 1 → push individuale (l'evento originale)
    // - count >  1 → push aggregato ("N persone hanno...")
    if (payload.batchKey && payload.category) {
      const bkey = `${userId}:${payload.category}:${payload.batchKey}`;
      const existing = batchQueue.get(bkey);
      if (existing) {
        existing.count += 1;
        // NON resettare il timer: la finestra resta ancorata al primo evento
        // così l'aggregato arriva entro 10 minuti dal primo trigger.
        batchQueue.set(bkey, existing);
        return; // silenzio fino al flush
      }
      const entry: BatchEntry = {
        count: 1,
        firstActorName: payload.batchActorName,
        payload,
        timer: setTimeout(() => flushBatch(userId, bkey), BATCH_WINDOW_MS),
      };
      batchQueue.set(bkey, entry);
      return; // niente push immediato: si attende la finestra
    }

    await scheduleDelivery(userId, payload, deferMs);
  } catch (e) {
    console.error('Error sending push to user:', e);
  }
}

async function flushBatch(userId: string, bkey: string) {
  const entry = batchQueue.get(bkey);
  if (!entry) return;
  batchQueue.delete(bkey);
  // Ricalcola allowed/defer al momento del flush — le quiet hours
  // potrebbero essere cambiate (entrate o uscite) durante la finestra di 10min.
  const { allowed, deferMs } = await shouldSendNotification(userId, entry.payload.category);
  if (!allowed) return;
  // Singolo evento isolato: invia il payload originale così com'è.
  if (entry.count === 1) {
    await scheduleDelivery(userId, entry.payload, deferMs);
    return;
  }
  // 2+ eventi: emetti UN solo riassunto aggregato.
  const tpl = entry.payload.batchTemplate;
  const summary = tpl
    ? tpl(entry.count, entry.firstActorName)
    : { title: entry.payload.title, body: `${entry.count} nuove interazioni sul tuo contenuto` };
  const aggPayload: PushPayload = {
    ...entry.payload,
    title: summary.title,
    body: summary.body,
    tag: `${entry.payload.tag || 'fermenta'}-agg-${Date.now()}`,
  };
  await scheduleDelivery(userId, aggPayload, deferMs);
}

export async function sendPushToUserImmediate(userId: string, payload: PushPayload) {
  if (!vapidConfigured) return;
  try {
    // Bypass throttle/batching; rispetta solo allowed (non quiet hours)
    if (payload.category) {
      const prefs = await storage.getNotificationPreferences(userId);
      if (prefs && prefs.pushEnabled === false) return;
      if (prefs && (prefs as any)[`${payload.category}Push`] === false) return;
    }
    const tag = payload.tag || `fermenta-${payload.type || 'general'}`;
    const clean: any = { ...payload, tag };
    delete clean.category; delete clean.batchKey; delete clean.batchActorName; delete clean.batchTemplate;
    await deliverPush(userId, clean);
  } catch (e) {
    console.error('Error sending immediate push to user:', e);
  }
}

export async function sendPushToAdmins(payload: { title: string; body: string; url?: string; type?: string }) {
  try {
    const adminIds = await storage.getAdminUserIds();
    const enrichedPayload = { ...payload, tag: `fermenta-admin-${payload.type || 'general'}` };
    await Promise.allSettled(adminIds.map(id => deliverPush(id, enrichedPayload)));
  } catch (e) {
    console.error('Error sending push to admins:', e);
  }
}
