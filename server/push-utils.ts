import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@fermenta.to';

let vapidConfigured = false;

export function initVapid() {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  }
  return false;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!vapidConfigured) return;
  try {
    const subs = await storage.getPushSubscriptionsByUser(userId);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }
  } catch (e) {
    console.error('Error sending push to user:', e);
  }
}

export async function sendPushToAdmins(payload: { title: string; body: string; url?: string }) {
  try {
    const adminIds = await storage.getAdminUserIds();
    for (const adminId of adminIds) {
      await sendPushToUser(adminId, payload);
    }
  } catch (e) {
    console.error('Error sending push to admins:', e);
  }
}
