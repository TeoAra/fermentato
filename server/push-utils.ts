import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@fermenta.to';

let vapidConfigured = false;

const PUSH_TTL = 3600;
const PUSH_URGENCY = 'normal' as const;

const pushQueue: Map<string, { payload: any; timer: ReturnType<typeof setTimeout> }> = new Map();
const THROTTLE_MS = 10000;

export function initVapid() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  }
  return false;
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

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; type?: string; tag?: string; icon?: string; image?: string }) {
  if (!vapidConfigured) return;
  try {
    const tag = payload.tag || `fermenta-${payload.type || 'general'}`;
    const enrichedPayload = { ...payload, tag };

    const key = `${userId}:${tag}`;
    const existing = pushQueue.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      pushQueue.delete(key);
    }

    const timer = setTimeout(async () => {
      pushQueue.delete(key);
      try {
        await deliverPush(userId, enrichedPayload);
      } catch (e) {
        console.error('Error delivering push to user:', e);
      }
    }, THROTTLE_MS);

    pushQueue.set(key, { payload: enrichedPayload, timer });
  } catch (e) {
    console.error('Error sending push to user:', e);
  }
}

export async function sendPushToUserImmediate(userId: string, payload: { title: string; body: string; url?: string; type?: string; tag?: string; icon?: string; image?: string }) {
  if (!vapidConfigured) return;
  try {
    const tag = payload.tag || `fermenta-${payload.type || 'general'}`;
    await deliverPush(userId, { ...payload, tag });
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
