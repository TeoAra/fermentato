import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

let stripeSyncInstance: StripeSync | null = null;

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Connect the Stripe integration.");
  return key;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(getStripeSecretKey(), { apiVersion: "2025-02-24.acacia" });
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSyncInstance) {
    const databaseUrl = getDatabaseUrl();
    stripeSyncInstance = new StripeSync({
      stripeSecretKey: getStripeSecretKey(),
      poolConfig: { connectionString: databaseUrl },
    });
  }
  return stripeSyncInstance;
}
