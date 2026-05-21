import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import http from "node:http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ── Proxy /screenshots/* → marketing editor (Next.js su localhost:23639) ──
// Solo in dev: in produzione l'editor NON deve essere esposto pubblicamente
// (le sue API permettono scrittura file). Deve stare PRIMA di compression/express.json.
if (process.env.NODE_ENV !== "production") {
  app.use("/screenshots", (req, res) => {
    const proxyReq = http.request(
      {
        host: "127.0.0.1",
        port: 23639,
        method: req.method,
        path: req.originalUrl,
        headers: { ...req.headers, host: "127.0.0.1:23639" },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", (err) => {
      res.status(502).type("text/plain").send("Marketing editor non raggiungibile: " + err.message);
    });
    req.pipe(proxyReq);
  });
}

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

// Webhook WhatsApp — raw body per verifica firma HMAC (deve stare prima di express.json)
app.post(
  "/api/bot/whatsapp/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const { handleWhatsAppWebhook } = await import("./whatsapp-bot");
      await handleWhatsAppWebhook(req, res);
    } catch (error: any) {
      console.error("WhatsApp webhook error:", error.message);
      res.status(200).json({ received: true }); // Sempre 200 a Meta
    }
  }
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use((req, res, next) => {
  if (!req.path.includes('cast-receiver')) {
    res.setHeader('Permissions-Policy', 'display-capture=(self)');
  }
  next();
});

// ── Cache control ─────────────────────────────────────────────────────────────
// L'index.html deve essere sempre fresco: referenzia gli hash dei bundle JS/CSS.
// Se il WebView Android (Capacitor) lo mette in cache, dopo ogni deploy continua
// a caricare il vecchio JS e le modifiche al codice non hanno effetto.
// I file sotto /assets/ hanno hash nel nome (prodotti da Vite) → immutabili.
app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith('/assets/') || p.startsWith('/api/download/apk')) {
    // bundle JS/CSS immutabili (hash nel nome) o download APK → cache aggressiva
    if (p.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  } else if (!p.startsWith('/api') && !p.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|mp4|webm)$/i)) {
    // HTML e route SPA → mai cachare
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
    // Asset hardening: una richiesta a /assets/<file> non esistente DEVE restituire 404,
    // non il fallback SPA index.html. Altrimenti i service worker e i browser cachavano
    // l'HTML come fosse un chunk JS → "Failed to fetch dynamically imported module".
    const path = await import("path");
    const distPublic = path.resolve(import.meta.dirname, "public");
    const express = (await import("express")).default;
    app.use("/assets", express.static(path.join(distPublic, "assets"), { immutable: true, maxAge: "1y" }));
    app.use("/assets", (_req, res) => {
      // CRITICO: il middleware globale ha già impostato 'public, max-age=31536000, immutable'
      // per qualunque path che inizia con /assets/. Lo SOVRASCRIVIAMO esplicitamente con
      // no-store così Cloudflare e i browser NON cachano i 404 (altrimenti un chunk
      // mancante anche solo per un istante diventa 404 cached per 1 anno).
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.removeHeader("ETag");
      // Usiamo res.end() invece di res.send() perché send() rigenera l'ETag
      // (Express genera ETag automaticamente quando il body è una stringa),
      // e un 404 cached con ETag potrebbe essere revalidato a 304 dalla CDN.
      res.status(404).end("Asset not found");
    });
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
