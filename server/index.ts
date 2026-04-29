import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(compression());

// CORS per Capacitor (app nativa) — deve stare PRIMA di qualsiasi route
const CAPACITOR_ORIGINS = [
  'https://app.fermenta.to',   // Capacitor hostname configurato
  'capacitor://localhost',      // fallback Capacitor
  'https://localhost',          // Capacitor con androidScheme https
  'http://localhost',           // dev locale
];
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && CAPACITOR_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  }
  next();
});

// Webhook Stripe deve essere registrato PRIMA di express.json
// altrimenti il body viene parsato e la verifica della firma fallisce
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }
      const { WebhookHandlers } = await import("./webhookHandlers");
      await WebhookHandlers.processWebhook(req.body as Buffer, signature);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use((req, res, next) => {
  if (!req.path.includes('cast-receiver')) {
    res.setHeader('Permissions-Policy', 'presentation=(self), display-capture=(self)');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Inizializza schema Stripe in background (non blocca il server)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && process.env.STRIPE_SECRET_KEY) {
    import("stripe-replit-sync").then(async ({ runMigrations }) => {
      try {
        await runMigrations({ databaseUrl, schema: "stripe" });
        log("Stripe schema ready");
        const { getStripeSync } = await import("./stripeClient");
        const stripeSync = await getStripeSync();
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
        if (domain) {
          stripeSync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`)
            .then(() => log("Stripe webhook configured"))
            .catch((err: any) => console.error("Stripe webhook setup error:", err.message));
        }
        stripeSync.syncBackfill()
          .then(() => log("Stripe data synced"))
          .catch((err: any) => console.error("Stripe sync error:", err.message));
      } catch (err: any) {
        console.error("Stripe init error:", err.message);
      }
    }).catch((err: any) => console.error("stripe-replit-sync import error:", err.message));
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
