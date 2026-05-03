// Test e2e per preferenze notifiche, quiet hours e batcher (Task #22).
//
// Esegui con:
//   npx tsx --test tests/notifications.test.ts
//
// Richiede DATABASE_URL valido (usa il dev DB; crea/cleana un utente di test).
// I test su sendPushToUser/batcher mockano storage + web-push e usano
// node:test mock.timers per non attendere realmente i 10 minuti del batcher.

import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import webpush, { type SendResult } from "web-push";
import type {
  InsertNotification,
  InsertNotificationPreference,
  NotificationPreference,
  PushSubscription,
} from "../shared/schema";

// VAPID deve essere configurato PRIMA di importare push-utils, perché legge
// process.env al module load.
const vapidKeys = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
process.env.VAPID_SUBJECT = "mailto:test@fermenta.to";

const pushUtils = await import("../server/push-utils");
const { storage } = await import("../server/storage");
const { pool } = await import("../server/db");
pushUtils.initVapid();

// ─── Helpers tipizzati ──────────────────────────────────────────────────────
const TEST_USER_PREFIX = "test-notif-";
const testUserId = `${TEST_USER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Costruisce un NotificationPreference completo con override mirati per i test. */
function buildPrefs(overrides: Partial<NotificationPreference>): NotificationPreference {
  const base: NotificationPreference = {
    id: 1,
    userId: "test",
    tapChanges: true,
    events: true,
    newPubs: false,
    checkinLikes: true,
    checkinComments: true,
    newFollowers: true,
    breweryReplies: true,
    reportUpdates: true,
    adminBroadcasts: true,
    tapChangesPush: true,
    eventsPush: true,
    newPubsPush: false,
    checkinLikesPush: true,
    checkinCommentsPush: true,
    newFollowersPush: true,
    breweryRepliesPush: true,
    reportUpdatesPush: true,
    adminBroadcastsPush: true,
    tapChangesEmail: false,
    eventsEmail: false,
    newPubsEmail: false,
    checkinLikesEmail: false,
    checkinCommentsEmail: false,
    newFollowersEmail: false,
    breweryRepliesEmail: true,
    reportUpdatesEmail: true,
    adminBroadcastsEmail: true,
    pushEnabled: true,
    inAppEnabled: true,
    emailEnabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    quietHoursMode: "queue",
    updatedAt: new Date(),
  };
  return { ...base, ...overrides };
}

/** Patch di un metodo dello storage (singleton) preservando i tipi. */
type StorageKey = keyof typeof storage;
function patchStorage<K extends StorageKey>(key: K, fn: (typeof storage)[K]): () => void {
  const original = storage[key];
  Object.assign(storage, { [key]: fn });
  return () => {
    Object.assign(storage, { [key]: original });
  };
}

/** Patch tipizzato di webpush.sendNotification per intercettare i payload. */
function patchWebPushSend(
  fn: (typeof webpush)["sendNotification"],
): () => void {
  const original = webpush.sendNotification;
  Object.assign(webpush, { sendNotification: fn });
  return () => {
    Object.assign(webpush, { sendNotification: original });
  };
}

async function createTestUser(id: string) {
  await pool.query(
    `INSERT INTO users (id, email, user_type, nickname)
     VALUES ($1, $2, 'customer', $3)
     ON CONFLICT (id) DO NOTHING`,
    [id, `${id}@test.local`, id],
  );
}

async function cleanupTestUser(id: string) {
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM notification_preferences WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}

before(async () => {
  await createTestUser(testUserId);
});

after(async () => {
  await cleanupTestUser(testUserId);
  // Non chiudiamo il pool: storage lo usa anche dopo i test e tsx termina il processo.
});

// ─── 1. createNotification rispetta inAppEnabled ───────────────────────────
test("createNotification: inAppEnabled=false sopprime ogni tipo (id=0)", async () => {
  const prefsUpdate: Partial<InsertNotificationPreference> = {
    inAppEnabled: false,
    tapChanges: true,
    checkinLikes: true,
    adminBroadcasts: true,
  };
  await storage.upsertNotificationPreferences(testUserId, prefsUpdate);

  const types = ["tap_change", "checkin_like", "event", "admin_broadcast", "brewery_reply"];
  for (const type of types) {
    const insert: InsertNotification = {
      userId: testUserId,
      type,
      title: `t-${type}`,
      message: "test",
    };
    const n = await storage.createNotification(insert);
    assert.equal(n.id, 0, `Notifica ${type} doveva essere soppressa (inAppEnabled=false) ma id=${n.id}`);
  }

  const { rows } = await pool.query<{ c: number }>(
    `SELECT count(*)::int AS c FROM notifications WHERE user_id = $1`,
    [testUserId],
  );
  assert.equal(rows[0].c, 0, "Nessuna notifica doveva essere persistita");
});

// ─── 2. createNotification rispetta categoria ───────────────────────────────
test("createNotification: categoria=false sopprime solo quel tipo", async () => {
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [testUserId]);
  const prefsUpdate: Partial<InsertNotificationPreference> = {
    inAppEnabled: true,
    checkinLikes: false, // disabilitata
    tapChanges: true, // abilitata
  };
  await storage.upsertNotificationPreferences(testUserId, prefsUpdate);

  const blockedInsert: InsertNotification = {
    userId: testUserId,
    type: "checkin_like",
    title: "blocked",
    message: "test",
  };
  const blocked = await storage.createNotification(blockedInsert);
  assert.equal(blocked.id, 0, "checkin_like doveva essere soppresso");

  const allowedInsert: InsertNotification = {
    userId: testUserId,
    type: "tap_change",
    title: "allowed",
    message: "test",
  };
  const allowed = await storage.createNotification(allowedInsert);
  assert.notEqual(allowed.id, 0, "tap_change doveva essere persistito");

  const { rows } = await pool.query<{ type: string }>(
    `SELECT type FROM notifications WHERE user_id = $1 ORDER BY id`,
    [testUserId],
  );
  assert.deepEqual(
    rows.map((r) => r.type),
    ["tap_change"],
    "Solo tap_change doveva essere salvato",
  );
});

// ─── 3. shouldSendNotification: master pushEnabled ─────────────────────────
test("shouldSendNotification: pushEnabled=false blocca tutto", async () => {
  const restore = patchStorage("getNotificationPreferences", async () =>
    buildPrefs({ pushEnabled: false }),
  );
  try {
    const r = await pushUtils.shouldSendNotification("u1", "checkinLikes");
    assert.equal(r.allowed, false);
    assert.equal(r.deferMs, 0);
  } finally {
    restore();
  }
});

test("shouldSendNotification: <category>Push=false blocca solo quella categoria", async () => {
  const restore = patchStorage("getNotificationPreferences", async () =>
    buildPrefs({ checkinLikesPush: false, tapChangesPush: true }),
  );
  try {
    const blocked = await pushUtils.shouldSendNotification("u1", "checkinLikes");
    assert.equal(blocked.allowed, false);
    const allowed = await pushUtils.shouldSendNotification("u1", "tapChanges");
    assert.equal(allowed.allowed, true);
    assert.equal(allowed.deferMs, 0);
  } finally {
    restore();
  }
});

// ─── 4. quiet hours skip vs queue ──────────────────────────────────────────
test("quiet hours mode=skip → allowed=false; mode=queue → allowed=true con deferMs>0", async () => {
  const now = new Date();
  // Finestra che include "ora": [now-1h, now+1h]
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${pad((now.getHours() - 1 + 24) % 24)}:${pad(now.getMinutes())}`;
  const end = `${pad((now.getHours() + 1) % 24)}:${pad(now.getMinutes())}`;

  const restoreSkip = patchStorage("getNotificationPreferences", async () =>
    buildPrefs({ quietHoursStart: start, quietHoursEnd: end, quietHoursMode: "skip" }),
  );
  const skipRes = await pushUtils.shouldSendNotification("u1", "checkinLikes");
  assert.equal(skipRes.allowed, false, "mode=skip in quiet hours deve bloccare");
  assert.equal(skipRes.deferMs, 0);
  restoreSkip();

  const restoreQueue = patchStorage("getNotificationPreferences", async () =>
    buildPrefs({ quietHoursStart: start, quietHoursEnd: end, quietHoursMode: "queue" }),
  );
  const queueRes = await pushUtils.shouldSendNotification("u1", "checkinLikes");
  assert.equal(queueRes.allowed, true, "mode=queue in quiet hours deve consentire");
  assert.ok(queueRes.deferMs > 0, `deferMs deve essere >0 in quiet hours queue (ricevuto ${queueRes.deferMs})`);
  restoreQueue();
});

test("quiet hours: fuori finestra deferMs=0", async () => {
  // Finestra che NON include "ora": [now+2h, now+3h]
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${pad((now.getHours() + 2) % 24)}:${pad(now.getMinutes())}`;
  const end = `${pad((now.getHours() + 3) % 24)}:${pad(now.getMinutes())}`;

  const restore = patchStorage("getNotificationPreferences", async () =>
    buildPrefs({ quietHoursStart: start, quietHoursEnd: end, quietHoursMode: "queue" }),
  );
  try {
    const r = await pushUtils.shouldSendNotification("u1", "checkinLikes");
    assert.equal(r.allowed, true);
    assert.equal(r.deferMs, 0);
  } finally {
    restore();
  }
});

// ─── 5. Batcher: 1 immediato + 1 aggregato ────────────────────────────────
//
// Acceptance criterion (Task #22): "3 like in 10 minuti producono 1 push
// immediato + 1 push aggregato". Implementato in server/push-utils.ts con
// BATCH_THRESHOLD=1 (regola "send-first then aggregate"): il primo evento
// della finestra parte subito, dal secondo in poi vengono soppressi e
// raccolti in 1 sola push aggregata al flush della finestra.

/** Tipo del payload realmente serializzato e inviato a sendNotification. */
type SentPushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: string;
  tag?: string;
  icon?: string;
  image?: string;
};

/** Setup mock condiviso per i test del batcher. Restituisce array catturato + restore. */
function mockBatcherEnv(endpoint: string): { sent: SentPushPayload[]; restore: () => void } {
  const sent: SentPushPayload[] = [];
  const fakeSub: PushSubscription = {
    id: 1,
    userId: "batch-user",
    endpoint,
    p256dh: "x",
    auth: "y",
    userAgent: null,
    createdAt: new Date(),
  };
  const restorePrefs = patchStorage("getNotificationPreferences", async () => buildPrefs({}));
  const restoreSubs = patchStorage("getPushSubscriptionsByUser", async () => [fakeSub]);
  const restoreDel = patchStorage("deletePushSubscription", async () => {});
  const restoreSend = patchWebPushSend(async (_sub, payload) => {
    sent.push(JSON.parse(String(payload)) as SentPushPayload);
    const result: SendResult = { statusCode: 201, body: "", headers: {} };
    return result;
  });
  return {
    sent,
    restore: () => {
      restoreSend();
      restoreDel();
      restoreSubs();
      restorePrefs();
    },
  };
}

test("batcher: 3 like in 10min → 1 push immediato + 1 push aggregato (Task #22 AC)", async () => {
  const { sent, restore } = mockBatcherEnv("https://example/ep-ac");
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const userId = "batch-user-ac";
    const basePayload = {
      title: "💛 Like",
      body: "x",
      url: "/feed",
      tag: "checkin-like-Tac",
      category: "checkinLikes" as const,
      batchKey: "checkin-like:Tac",
      batchTemplate: (count: number) => ({
        title: "💛 Aggregato",
        body: `${count} persone hanno messo like`,
      }),
    };
    await pushUtils.sendPushToUser(userId, { ...basePayload });
    await pushUtils.sendPushToUser(userId, { ...basePayload });
    await pushUtils.sendPushToUser(userId, { ...basePayload });

    // Dopo throttle 10s: 1 sola push immediata (la prima del batch).
    mock.timers.tick(11_000);
    await new Promise((r) => setImmediate(r));
    const immediates = sent.filter((p) => p.title === "💛 Like");
    assert.equal(immediates.length, 1, `attesa 1 push immediata, ricevute ${immediates.length}`);

    // Dopo flush batch (10min) + throttle aggregata (10s): 1 push aggregata.
    mock.timers.tick(10 * 60 * 1000);
    await new Promise((r) => setImmediate(r));
    mock.timers.tick(11_000);
    await new Promise((r) => setImmediate(r));

    const aggregates = sent.filter((p) => p.title === "💛 Aggregato");
    assert.equal(aggregates.length, 1, `attesa 1 push aggregata, ricevute ${aggregates.length}`);
    assert.match(
      aggregates[0].body,
      /3 persone/,
      `body aggregato atteso "3 persone…", ricevuto: ${aggregates[0].body}`,
    );

    assert.equal(sent.length, 2, `totale push attese: 2 (1 immediato + 1 aggregato), ricevute ${sent.length}`);
  } finally {
    mock.timers.reset();
    restore();
  }
});

test("batcher: 1 like singolo in 10min → 1 push immediato, nessuna aggregata", async () => {
  const { sent, restore } = mockBatcherEnv("https://example/ep-single");
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const userId = "batch-user-single";
    await pushUtils.sendPushToUser(userId, {
      title: "💛 Like",
      body: "x",
      url: "/feed",
      tag: "checkin-like-Ts",
      category: "checkinLikes" as const,
      batchKey: "checkin-like:Ts",
      batchTemplate: (count: number) => ({
        title: "💛 Aggregato",
        body: `${count} persone hanno messo like`,
      }),
    });

    mock.timers.tick(11_000);
    await new Promise((r) => setImmediate(r));
    assert.equal(sent.length, 1, "1 like → 1 push immediata");
    assert.equal(sent[0].title, "💛 Like");

    // Flush batch: con 1 solo evento (= soglia) NON deve emettere aggregata.
    mock.timers.tick(10 * 60 * 1000);
    await new Promise((r) => setImmediate(r));
    mock.timers.tick(11_000);
    await new Promise((r) => setImmediate(r));
    assert.equal(sent.length, 1, "evento unico non deve produrre aggregata extra");
  } finally {
    mock.timers.reset();
    restore();
  }
});

// ─── 6. quietWindowRemainingMs unit ────────────────────────────────────────
test("quietWindowRemainingMs: fuori finestra ritorna 0", () => {
  // Finestra 22:00 → 07:00, ora corrente 12:00
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  assert.equal(pushUtils.quietWindowRemainingMs("22:00", "07:00", now), 0);
});

test("quietWindowRemainingMs: dentro finestra ritorna ms al termine", () => {
  // Finestra 22:00 → 07:00, ora corrente 23:00 → ~8h restanti
  const now = new Date();
  now.setHours(23, 0, 0, 0);
  const ms = pushUtils.quietWindowRemainingMs("22:00", "07:00", now);
  assert.ok(ms > 7 * 3600 * 1000 && ms <= 8 * 3600 * 1000, `atteso ~8h, ricevuto ${ms}ms`);
});
