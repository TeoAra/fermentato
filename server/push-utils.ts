import webpush from "web-push";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import http2 from "http2";
import { GoogleAuth } from "google-auth-library";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@fermenta.to';

let vapidConfigured = false;

// ── APNs config (iOS native push) ──────────────────────────────────────────
const APNS_KEY_ID    = process.env.APNS_KEY_ID    || '';
const APNS_TEAM_ID   = process.env.APNS_TEAM_ID   || '';
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'to.fermentato.app';
// La chiave .p8 deve essere in APNS_P8_KEY come stringa PEM, ad es.:
//   -----BEGIN PRIVATE KEY-----\nABC...\n-----END PRIVATE KEY-----
const APNS_P8_KEY = (process.env.APNS_P8_KEY || '').replace(/\\n/g, '\n');
const apnsConfigured = !!(APNS_KEY_ID && APNS_TEAM_ID && APNS_P8_KEY);

// ── FCM config (Android native push) — HTTP v1 API con Service Account ──────
// FCM_SERVICE_ACCOUNT: JSON del service account scaricato da
//   Firebase Console → Impostazioni progetto → Account di servizio →
//   "Genera nuova chiave privata" → copia l'intero contenuto JSON come secret.
const FCM_SERVICE_ACCOUNT_RAW = process.env.FCM_SERVICE_ACCOUNT || '';
let fcmCredentials: any = null;
let fcmProjectId = '';
try {
  if (FCM_SERVICE_ACCOUNT_RAW) {
    fcmCredentials = JSON.parse(FCM_SERVICE_ACCOUNT_RAW);
    fcmProjectId = fcmCredentials.project_id || '';
  }
} catch { /* JSON non valido → fcmCredentials rimane null */ }
const fcmConfigured = !!(fcmCredentials && fcmProjectId);

// Client Google Auth con cache del token (si rinnova automaticamente)
let _fcmAuthClient: any = null;
async function getFcmAccessToken(): Promise<string> {
  if (!fcmConfigured) throw new Error('FCM non configurato');
  if (!_fcmAuthClient) {
    const auth = new GoogleAuth({
      credentials: fcmCredentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    _fcmAuthClient = await auth.getClient();
  }
  const { token } = await _fcmAuthClient.getAccessToken();
  if (!token) throw new Error('FCM: impossibile ottenere access token');
  return token;
}

// Invia una singola notifica FCM (Android) via HTTP v1 API
async function sendFcm(deviceToken: string, payload: any): Promise<void> {
  if (!fcmConfigured) return;
  let accessToken: string;
  try { accessToken = await getFcmAccessToken(); }
  catch (err) { console.error('[fcm] auth error:', err); return; }

  const body = JSON.stringify({
    message: {
      token: deviceToken,
      notification: { title: payload.title, body: payload.body },
      data: {
        url:  payload.url  || '',
        type: payload.type || '',
        tag:  payload.tag  || '',
      },
      android: {
        priority: 'HIGH',
        ttl: `${PUSH_TTL}s`,
        notification: {
          sound: 'default',
          tag: payload.tag || '',
          icon: 'ic_notification',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    },
  });

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[fcm] HTTP error', res.status, text);
      // Token non più valido → rimuovi dal DB
      if (res.status === 404 || text.includes('UNREGISTERED') || text.includes('INVALID_ARGUMENT')) {
        storage.deleteNativePushToken(deviceToken).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[fcm] send error:', err);
  }
}

// Genera un JWT APNs valido per 55 minuti (max 60)
let apnsJwtCache: { token: string; exp: number } | null = null;
function getApnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  if (apnsJwtCache && apnsJwtCache.exp - now > 120) return apnsJwtCache.token;
  const token = jwt.sign({ iss: APNS_TEAM_ID, iat: now }, APNS_P8_KEY, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: APNS_KEY_ID } as any,
  });
  apnsJwtCache = { token, exp: now + 55 * 60 };
  return token;
}

// Invia una singola notifica APNs via HTTP/2
async function sendApns(deviceToken: string, payload: any): Promise<void> {
  if (!apnsConfigured) return;
  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
      badge: 1,
      'mutable-content': 1,
    },
    url: payload.url,
    tag: payload.tag,
    type: payload.type,
  });
  const host = 'api.push.apple.com';
  const path = `/3/device/${deviceToken}`;
  const jwtToken = getApnsJwt();

  return new Promise((resolve, reject) => {
    try {
      const client = http2.connect(`https://${host}`);
      client.on('error', reject);
      const req = client.request({
        ':method': 'POST',
        ':path': path,
        'authorization': `bearer ${jwtToken}`,
        'apns-topic': APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + PUSH_TTL),
        'content-type': 'application/json',
      });
      req.write(body);
      req.end();
      req.setEncoding('utf8');
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        client.close();
        if (data) {
          try {
            const json = JSON.parse(data);
            if (json.reason === 'BadDeviceToken' || json.reason === 'Unregistered') {
              storage.deleteNativePushToken(deviceToken).catch(() => {});
            }
          } catch { /* empty response = success */ }
        }
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

const PUSH_TTL = 3600;
const PUSH_URGENCY = 'normal' as const;

// Throttle anti-spam: stesso (userId,tag) entro 10s viene unificato.
const pushQueue: Map<string, { payload: any; timer: ReturnType<typeof setTimeout> }> = new Map();
const THROTTLE_MS = 10000;

// Batcher di aggregazione: raccoglie like/commenti per (userId,category,targetId)
// in una finestra di 10 minuti.
// Regola "send-first then aggregate" (Task #22 acceptance criterion):
//   - il PRIMO evento della finestra è inviato subito come push individuale
//     (con tag univoco anti-throttle), così l'utente vede comunque feedback
//     immediato sul primo like/commento;
//   - dal 2° evento in poi vengono soppressi e a fine finestra emessa 1
//     sola push aggregata "N persone hanno..." per riassumerli.
//   Esempio: 3 like in 10min → 1 push immediato + 1 push aggregato.
const BATCH_WINDOW_MS = 10 * 60 * 1000;
const BATCH_THRESHOLD = 1;
type BatchEntry = {
  count: number;
  firstActorName?: string;
  payload: any;
  payloads: PushPayload[]; // tutti i payload bufferizzati per replay sotto soglia
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
  // Web push (VAPID) per browser PWA — solo se VAPID è configurato
  const subs = vapidConfigured ? await storage.getPushSubscriptionsByUser(userId) : [];
  const webPromises = subs.map(async (sub) => {
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

  const nativeTokens = await storage.getNativePushTokensByUser(userId);

  // APNs per iOS native (richiede APNS_KEY_ID, APNS_TEAM_ID, APNS_P8_KEY)
  const apnsPromises = nativeTokens
    .filter(t => t.platform === 'ios')
    .map(async (t) => {
      try {
        await sendApns(t.token, payload);
      } catch (err) {
        console.error('[apns] errore invio:', err);
      }
    });

  // FCM per Android native (richiede FCM_SERVER_KEY)
  const fcmPromises = nativeTokens
    .filter(t => t.platform === 'android')
    .map(async (t) => {
      try {
        await sendFcm(t.token, payload);
      } catch (err) {
        console.error('[fcm] errore invio:', err);
      }
    });

  await Promise.allSettled([...webPromises, ...apnsPromises, ...fcmPromises]);
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
  // NB: non blocchiamo su !vapidConfigured — le push iOS/Android native vanno
  // inviate anche senza VAPID. deliverPush salta web push se VAPID assente.
  if (!vapidConfigured && !apnsConfigured && !fcmConfigured) return;
  try {
    const { allowed, deferMs } = await shouldSendNotification(userId, payload.category);
    if (!allowed) return;

    // Aggregazione: send-immediate + threshold (vedi commento al top).
    if (payload.batchKey && payload.category) {
      const bkey = `${userId}:${payload.category}:${payload.batchKey}`;
      const existing = batchQueue.get(bkey);
      if (existing) {
        existing.count += 1;
        // NON resettiamo il timer: finestra ancorata al primo evento.
        batchQueue.set(bkey, existing);
        if (existing.count <= BATCH_THRESHOLD) {
          const indiv: PushPayload = {
            ...payload,
            tag: `${payload.tag || 'fermenta'}-${existing.count}-${Date.now()}`,
          };
          await scheduleDelivery(userId, indiv, deferMs);
        }
        return;
      }
      const entry: BatchEntry = {
        count: 1,
        firstActorName: payload.batchActorName,
        payload,
        payloads: [payload],
        timer: setTimeout(() => flushBatch(userId, bkey), BATCH_WINDOW_MS),
      };
      batchQueue.set(bkey, entry);
      const first: PushPayload = {
        ...payload,
        tag: `${payload.tag || 'fermenta'}-1-${Date.now()}`,
      };
      await scheduleDelivery(userId, first, deferMs);
      return;
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
  // Sotto/uguale soglia (BATCH_THRESHOLD=1): solo il 1° evento è stato
  // inviato come push individuale al momento dell'arrivo; non c'è nulla
  // da aggregare se non sono arrivati altri eventi.
  if (entry.count <= BATCH_THRESHOLD) return;
  // Sopra soglia (>1, cioè 2+ eventi): 1 sola push aggregata che riassume
  // tutti gli eventi della finestra (incluso il primo già inviato), così
  // l'utente vede sia il feedback immediato sia il riepilogo finale.
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
  // Stesso fix di sendPushToUser: APNs/FCM devono funzionare anche senza VAPID.
  if (!vapidConfigured && !apnsConfigured && !fcmConfigured) return;
  try {
    // Rispetta SEMPRE le quiet hours + categoria + master pushEnabled.
    // Bypassa solo throttle/batching (per push critiche tipo segnalazioni
    // moderate, dove vogliamo consegna senza dedup ma comunque non in
    // ore di silenzio "skip" — in modalità "queue" verrà comunque rinviata).
    const { allowed, deferMs } = await shouldSendNotification(userId, payload.category);
    if (!allowed) return;
    const tag = payload.tag || `fermenta-${payload.type || 'general'}`;
    const clean: any = { ...payload, tag };
    delete clean.category; delete clean.batchKey; delete clean.batchActorName; delete clean.batchTemplate;
    if (deferMs > 0) {
      setTimeout(() => { deliverPush(userId, clean).catch(e => console.error('deferred immediate push:', e)); }, deferMs);
      return;
    }
    await deliverPush(userId, clean);
  } catch (e) {
    console.error('Error sending immediate push to user:', e);
  }
}

export async function sendPushToAdmins(payload: { title: string; body: string; url?: string; type?: string; category?: NotifCategory }) {
  try {
    const adminIds = await storage.getAdminUserIds();
    // Default category: reportUpdates (notifiche admin sono in genere su segnalazioni).
    const category: NotifCategory = payload.category || 'reportUpdates';
    const enrichedPayload = { ...payload, tag: `fermenta-admin-${payload.type || 'general'}`, category };
    // Routing per-admin attraverso sendPushToUser così rispettiamo
    // pushEnabled/<cat>Push/quiet hours per ogni admin individuale.
    await Promise.allSettled(adminIds.map(id => sendPushToUser(id, enrichedPayload)));
  } catch (e) {
    console.error('Error sending push to admins:', e);
  }
}
