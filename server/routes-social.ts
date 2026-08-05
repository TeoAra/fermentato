import type { Express } from "express";
import { pool } from "./db";
import { isAuthenticated, isAdmin } from "./auth";
import { upload, uploadImage } from "./cloudinary";
import { sendPushToUser, sendPushToAdmins } from "./push-utils";
import { storage } from "./storage";
import Parser from "rss-parser";

const rssParser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Fermenta.to RSS Aggregator/1.0" },
});

// ──────────────────────────────────────────────────────────────────────────────
// Migrations (idempotenti, eseguite all'avvio)
// ──────────────────────────────────────────────────────────────────────────────
async function runSocialMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkin_likes (
        id SERIAL PRIMARY KEY,
        tasting_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tasting_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_checkin_likes_tasting ON checkin_likes(tasting_id);

      CREATE TABLE IF NOT EXISTS checkin_comments (
        id SERIAL PRIMARY KEY,
        tasting_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_checkin_comments_tasting ON checkin_comments(tasting_id);

      CREATE TABLE IF NOT EXISTS microblog_posts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        beer_id INTEGER,
        pub_id INTEGER,
        brewery_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_microblog_user ON microblog_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_microblog_created ON microblog_posts(created_at DESC);

      CREATE TABLE IF NOT EXISTS microblog_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES microblog_posts(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS microblog_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES microblog_posts(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_broadcasts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        url TEXT,
        image_url TEXT,
        audience TEXT NOT NULL DEFAULT 'all',
        sent_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        sent_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rss_sources (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT TRUE,
        last_fetched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rss_items (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES rss_sources(id) ON DELETE CASCADE,
        guid TEXT NOT NULL,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        summary TEXT,
        image_url TEXT,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(source_id, guid)
      );
      CREATE INDEX IF NOT EXISTS idx_rss_items_published ON rss_items(published_at DESC);

      CREATE TABLE IF NOT EXISTS checkin_comment_likes (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER NOT NULL REFERENCES checkin_comments(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_ccl_comment ON checkin_comment_likes(comment_id);

      CREATE TABLE IF NOT EXISTS content_reports (
        id SERIAL PRIMARY KEY,
        target_type VARCHAR(30) NOT NULL,
        target_id INTEGER NOT NULL,
        reporter_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(50) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        resolved_at TIMESTAMP,
        resolved_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
      CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);

      -- Task #15: notification_preferences (categorie + canali + quiet hours)
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS checkin_likes BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS checkin_comments BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS new_followers BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS brewery_replies BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS report_updates BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS admin_broadcasts BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start VARCHAR(5);
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end VARCHAR(5);
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_mode VARCHAR(10) DEFAULT 'queue';
      -- Task #15 v2: canale push per categoria (controllo indipendente)
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS tap_changes_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS events_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS new_pubs_push BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS checkin_likes_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS checkin_comments_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS new_followers_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS brewery_replies_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS report_updates_push BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS admin_broadcasts_push BOOLEAN DEFAULT TRUE;
      -- Task #15 v3: canale email per categoria + master
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS tap_changes_email BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS events_email BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS new_pubs_email BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS checkin_likes_email BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS checkin_comments_email BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS new_followers_email BOOLEAN DEFAULT FALSE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS brewery_replies_email BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS report_updates_email BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS admin_broadcasts_email BOOLEAN DEFAULT TRUE;
      ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE;

      -- Task #20: post tagging extension
      ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS event_id INTEGER;
      ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS event_source_type TEXT;
      ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
      CREATE INDEX IF NOT EXISTS idx_microblog_pub_id ON microblog_posts(pub_id) WHERE pub_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_microblog_brewery_id ON microblog_posts(brewery_id) WHERE brewery_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_microblog_beer_id ON microblog_posts(beer_id) WHERE beer_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_microblog_event ON microblog_posts(event_id, event_source_type) WHERE event_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_microblog_hashtags ON microblog_posts USING GIN (hashtags);

      -- @mentions support
      ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}';
      CREATE INDEX IF NOT EXISTS idx_microblog_mentions ON microblog_posts USING GIN (mentions);
    `);

    // Backfill: copia review_reports → content_reports una sola volta
    try {
      await pool.query(`
        INSERT INTO content_reports (target_type, target_id, reporter_id, reason, description, status, resolved_at, created_at)
        SELECT 'review', rr.review_id, rr.reporter_id, rr.reason, rr.description,
               COALESCE(rr.status, 'pending'), rr.resolved_at, rr.created_at
        FROM review_reports rr
        WHERE NOT EXISTS (
          SELECT 1 FROM content_reports cr
          WHERE cr.target_type = 'review' AND cr.target_id = rr.review_id AND cr.reporter_id = rr.reporter_id
        )
      `);
    } catch (e: any) {
      console.warn("[social] review_reports backfill skipped:", e.message);
    }

    // Seed default RSS sources (italian craft beer media) — idempotent
    const defaultSources = [
      { name: "Cronache di Birra",        url: "https://www.cronachedibirra.it/feed/" },
      { name: "MoBI",                     url: "https://www.movimentobirra.it/feed/" },
      { name: "Microbirrifici.org",       url: "https://www.microbirrifici.org/feed/" },
      { name: "Reservoir Birra",          url: "https://www.reservoirbirra.it/feed/" },
    ];
    for (const s of defaultSources) {
      await pool.query(
        `INSERT INTO rss_sources (name, url) VALUES ($1, $2) ON CONFLICT (url) DO NOTHING`,
        [s.name, s.url],
      );
    }

    console.log("[social] migrations ok");
  } catch (err) {
    console.error("[social] migration error:", err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// RSS fetcher (cron interno)
// ──────────────────────────────────────────────────────────────────────────────
function pickImage(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
  if (item["media:content"]?.$?.url) return item["media:content"].$.url;
  const html = item["content:encoded"] || item.content || item.summary || "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 280);
}

async function fetchRssFeeds() {
  try {
    const { rows: sources } = await pool.query(
      `SELECT id, url FROM rss_sources WHERE enabled = TRUE`,
    );
    let inserted = 0;
    for (const src of sources) {
      try {
        const feed = await rssParser.parseURL(src.url);
        for (const item of feed.items.slice(0, 30)) {
          const guid = item.guid || item.link || item.title;
          if (!guid || !item.title || !item.link) continue;
          const summary = stripHtml(item.contentSnippet || item.summary || item.content || "");
          const imageUrl = pickImage(item);
          const publishedAt = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null);
          const r = await pool.query(
            `INSERT INTO rss_items (source_id, guid, title, link, summary, image_url, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (source_id, guid) DO NOTHING`,
            [src.id, guid, item.title, item.link, summary, imageUrl, publishedAt],
          );
          inserted += r.rowCount || 0;
        }
        await pool.query(`UPDATE rss_sources SET last_fetched_at = NOW() WHERE id = $1`, [src.id]);
      } catch (e: any) {
        console.warn(`[rss] feed ${src.url} failed:`, e.message);
      }
    }
    if (inserted > 0) console.log(`[rss] fetched ${inserted} new items from ${sources.length} sources`);
  } catch (err) {
    console.error("[rss] cron error:", err);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────────────────────────
export async function registerSocialRoutes(app: Express) {
  await runSocialMigrations();

  // Initial RSS fetch + cron every 30 min
  setTimeout(() => { fetchRssFeeds(); }, 30_000);
  setInterval(fetchRssFeeds, 30 * 60 * 1000);

  // ─── CHECK-IN: photo upload (alone, returns URL) ──────────────────────────
  app.post("/api/checkin/upload-photo", isAuthenticated, upload.single("photo"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Nessun file" });
      const url = await uploadImage(req.file.buffer, "checkin-photos");
      res.json({ url });
    } catch (e: any) {
      console.error("[checkin] photo upload error:", e);
      res.status(500).json({ message: "Upload fallito" });
    }
  });

  // ─── CHECK-IN: likes & comments ───────────────────────────────────────────
  app.post("/api/checkin/:id/like", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const tastingId = parseInt(req.params.id, 10);
    if (Number.isNaN(tastingId)) return res.status(400).json({ message: "ID non valido" });
    await pool.query(
      `INSERT INTO checkin_likes (tasting_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [tastingId, userId],
    );
    // notify owner if different
    const { rows } = await pool.query(`SELECT user_id FROM user_beer_tastings WHERE id = $1`, [tastingId]);
    if (rows[0] && rows[0].user_id !== userId) {
      const ownerId: string = rows[0].user_id;
      sendPushToUser(ownerId, {
        title: "💛 Hai un nuovo like",
        body: "A qualcuno è piaciuto il tuo check-in!",
        url: "/notifications",
        tag: `checkin-like-${tastingId}`,
        category: 'checkinLikes',
        batchKey: `checkin-like:${tastingId}`,
        batchTemplate: (count) => ({
          title: "💛 Nuovi like al tuo check-in",
          body: `${count} persone hanno messo like al tuo check-in`,
        }),
      });
      try {
        const prefs = await storage.getNotificationPreferences(ownerId);
        if (!prefs || prefs.checkinLikes !== false) {
          await storage.createNotification({
            userId: ownerId,
            type: 'checkin_like',
            title: "💛 Nuovo like",
            message: "A qualcuno è piaciuto il tuo check-in!",
            isRead: false,
          });
        }
      } catch {}
    }
    res.json({ liked: true });
  });

  app.delete("/api/checkin/:id/like", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const tastingId = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM checkin_likes WHERE tasting_id = $1 AND user_id = $2`, [tastingId, userId]);
    res.json({ liked: false });
  });

  app.get("/api/checkin/:id/likes", async (req, res) => {
    const tastingId = parseInt(req.params.id, 10);
    const userId = (req as any).user?.id ?? null;
    const [count, mine, commentsCount] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM checkin_likes WHERE tasting_id = $1`, [tastingId]),
      userId
        ? pool.query(`SELECT 1 FROM checkin_likes WHERE tasting_id = $1 AND user_id = $2`, [tastingId, userId])
        : Promise.resolve({ rows: [] } as any),
      pool.query(`SELECT COUNT(*)::int AS c FROM checkin_comments WHERE tasting_id = $1`, [tastingId]),
    ]);
    res.json({ count: count.rows[0].c, liked: mine.rows.length > 0, commentsCount: commentsCount.rows[0].c });
  });

  app.get("/api/checkin/:id/comments", async (req: any, res) => {
    const tastingId = parseInt(req.params.id, 10);
    const me = req.user?.id ?? null;
    const { rows } = await pool.query(`
      SELECT c.id, c.content, c.created_at,
             u.id AS user_id, u.nickname AS username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') AS display_name,
             u.profile_image_url,
             (SELECT COUNT(*)::int FROM checkin_comment_likes ccl WHERE ccl.comment_id = c.id) AS likes_count,
             ($2::varchar IS NOT NULL AND EXISTS(
                SELECT 1 FROM checkin_comment_likes ccl2
                WHERE ccl2.comment_id = c.id AND ccl2.user_id = $2
             )) AS liked
      FROM checkin_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.tasting_id = $1
      ORDER BY c.created_at ASC
      LIMIT 100
    `, [tastingId, me]);
    res.json(rows);
  });

  // Like/unlike singolo commento
  app.post("/api/checkin-comments/:id/like", isAuthenticated, async (req: any, res) => {
    const commentId = parseInt(req.params.id, 10);
    if (Number.isNaN(commentId)) return res.status(400).json({ message: "ID non valido" });
    await pool.query(
      `INSERT INTO checkin_comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [commentId, req.user.id],
    );
    const owner = await pool.query(`SELECT user_id FROM checkin_comments WHERE id = $1`, [commentId]);
    if (owner.rows[0] && owner.rows[0].user_id !== req.user.id) {
      sendPushToUser(owner.rows[0].user_id, {
        title: "💛 Like al tuo commento",
        body: "A qualcuno è piaciuto il tuo commento",
        url: "/feed",
        tag: `comment-like-${commentId}`,
        category: 'checkinLikes',
        batchKey: `comment-like:${commentId}`,
        batchTemplate: (count) => ({
          title: "💛 Nuovi like al tuo commento",
          body: `${count} persone hanno messo like al tuo commento`,
        }),
      });
    }
    res.json({ liked: true });
  });

  app.delete("/api/checkin-comments/:id/like", isAuthenticated, async (req: any, res) => {
    const commentId = parseInt(req.params.id, 10);
    await pool.query(
      `DELETE FROM checkin_comment_likes WHERE comment_id = $1 AND user_id = $2`,
      [commentId, req.user.id],
    );
    res.json({ liked: false });
  });

  // ─── SEGNALAZIONI UNIFICATE ──────────────────────────────────────────────
  // POST /api/reports  { targetType: 'review'|'checkin_comment', targetId, reason, description? }
  app.post("/api/reports", isAuthenticated, async (req: any, res) => {
    try {
      const { targetType, targetId, reason, description } = req.body ?? {};
      if (!["review", "checkin_comment"].includes(targetType)) {
        return res.status(400).json({ message: "Tipo non valido" });
      }
      const tid = parseInt(targetId, 10);
      if (Number.isNaN(tid)) return res.status(400).json({ message: "ID non valido" });
      if (!reason || typeof reason !== "string") {
        return res.status(400).json({ message: "Motivo obbligatorio" });
      }
      // Verifica esistenza del bersaglio
      const exists = targetType === "review"
        ? await pool.query(`SELECT 1 FROM user_beer_tastings WHERE id = $1`, [tid])
        : await pool.query(`SELECT 1 FROM checkin_comments WHERE id = $1`, [tid]);
      if (exists.rowCount === 0) return res.status(404).json({ message: "Contenuto non trovato" });

      // De-duplica: stesso reporter, stesso target, status pending → idempotente
      const dup = await pool.query(
        `SELECT id FROM content_reports WHERE target_type = $1 AND target_id = $2 AND reporter_id = $3 AND status = 'pending'`,
        [targetType, tid, req.user.id],
      );
      if (dup.rowCount && dup.rowCount > 0) {
        return res.json({ message: "Segnalazione già inviata", reportId: dup.rows[0].id, duplicate: true });
      }

      const ins = await pool.query(
        `INSERT INTO content_reports (target_type, target_id, reporter_id, reason, description)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [targetType, tid, req.user.id, reason.slice(0, 50), (description ?? null) ? String(description).slice(0, 500) : null],
      );
      // Notifica admin
      try {
        sendPushToAdmins({
          title: "🚩 Nuova segnalazione",
          body: targetType === "review" ? "Recensione segnalata dalla community" : "Commento segnalato dalla community",
          url: "/admin/moderation",
          type: "moderation",
        });
      } catch {}
      res.json({ message: "Segnalazione inviata", reportId: ins.rows[0].id });
    } catch (e: any) {
      console.error("[reports] error:", e);
      res.status(500).json({ message: "Errore nell'invio della segnalazione" });
    }
  });

  app.post("/api/checkin/:id/comments", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const tastingId = parseInt(req.params.id, 10);
    const content = String(req.body?.content ?? "").trim().slice(0, 500);
    if (!content) return res.status(400).json({ message: "Commento vuoto" });
    const { rows } = await pool.query(
      `INSERT INTO checkin_comments (tasting_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at`,
      [tastingId, userId, content],
    );
    const owner = await pool.query(`SELECT user_id FROM user_beer_tastings WHERE id = $1`, [tastingId]);
    if (owner.rows[0] && owner.rows[0].user_id !== userId) {
      const ownerId: string = owner.rows[0].user_id;
      sendPushToUser(ownerId, {
        title: "💬 Nuovo commento",
        body: content.slice(0, 80),
        url: "/notifications",
        tag: `checkin-comment-${tastingId}`,
        category: 'checkinComments',
        batchKey: `checkin-comment:${tastingId}`,
        batchTemplate: (count) => ({
          title: "💬 Nuovi commenti al tuo check-in",
          body: `${count} persone hanno commentato il tuo check-in`,
        }),
      });
      try {
        const prefs = await storage.getNotificationPreferences(ownerId);
        if (!prefs || prefs.checkinComments !== false) {
          await storage.createNotification({
            userId: ownerId,
            type: 'checkin_comment',
            title: "💬 Nuovo commento al tuo check-in",
            message: content.slice(0, 120),
            isRead: false,
          });
        }
      } catch {}
    }
    res.json(rows[0]);
  });

  app.delete("/api/checkin/comments/:commentId", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const commentId = parseInt(req.params.commentId, 10);
    await pool.query(`DELETE FROM checkin_comments WHERE id = $1 AND user_id = $2`, [commentId, userId]);
    res.json({ deleted: true });
  });

  app.patch("/api/checkin/comments/:commentId", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const commentId = parseInt(req.params.commentId, 10);
    if (Number.isNaN(commentId)) return res.status(400).json({ message: "ID non valido" });
    const content = String(req.body?.content ?? "").trim().slice(0, 500);
    if (!content) return res.status(400).json({ message: "Commento vuoto" });
    const { rows } = await pool.query(
      `UPDATE checkin_comments SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING id, content, created_at`,
      [content, commentId, userId],
    );
    if (!rows.length) return res.status(404).json({ message: "Commento non trovato" });
    res.json(rows[0]);
  });

  // ─── MICROBLOG ────────────────────────────────────────────────────────────
  app.post("/api/microblog/upload-image", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Nessun file" });
      const url = await uploadImage(req.file.buffer, "microblog");
      res.json({ url });
    } catch (e: any) {
      console.error("[microblog] upload error:", e);
      res.status(500).json({ message: "Upload fallito" });
    }
  });

  app.post("/api/microblog/posts", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const content = String(req.body?.content ?? "").trim().slice(0, 1000);
    if (!content) return res.status(400).json({ message: "Contenuto obbligatorio" });
    const imageUrl = req.body?.imageUrl ?? null;
    const beerId = req.body?.beerId ?? null;
    const pubId = req.body?.pubId ?? null;
    const breweryId = req.body?.breweryId ?? null;
    const eventId = req.body?.eventId ?? null;
    const eventSourceType = req.body?.eventSourceType
      && ["pub", "brewery"].includes(String(req.body.eventSourceType))
      ? String(req.body.eventSourceType) : null;
    // Extract hashtags (#parola): unicode-friendly, lowercased, deduped, capped
    const hashtagSet = new Set<string>();
    const re = /(?:^|[^A-Za-z0-9_#\u00C0-\u024F])#([A-Za-z0-9_\u00C0-\u024F]{2,30})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      hashtagSet.add(m[1].toLowerCase());
      if (hashtagSet.size >= 10) break;
    }
    const hashtags = Array.from(hashtagSet);

    // Extract @mentions: username 2-30 word chars, preceded by non-word or start
    const mentionSet = new Set<string>();
    const mre = /(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{2,30})/g;
    let mm: RegExpExecArray | null;
    // Strip HTML tags first so we match only visible text
    const plainContent = content.replace(/<[^>]+>/g, " ");
    while ((mm = mre.exec(plainContent)) !== null) {
      mentionSet.add(mm[1].toLowerCase());
      if (mentionSet.size >= 10) break;
    }
    const mentionNicknames = Array.from(mentionSet);

    const { rows } = await pool.query(
      `INSERT INTO microblog_posts (user_id, content, image_url, beer_id, pub_id, brewery_id, event_id, event_source_type, hashtags, mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, content, imageUrl, beerId, pubId, breweryId, eventId, eventSourceType, hashtags, mentionNicknames],
    );
    const newPost = rows[0];
    res.json(newPost);

    // Fire mention notifications (non-blocking, after response)
    if (mentionNicknames.length > 0) {
      try {
        const placeholders = mentionNicknames.map((_, i) => `$${i + 2}`).join(", ");
        const { rows: mentionedUsers } = await pool.query(
          `SELECT id, nickname,
                  COALESCE(nickname, NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), 'qualcuno') AS display_name
           FROM users WHERE lower(nickname) = ANY(ARRAY[${mentionNicknames.map((_, i) => `$${i + 1}`).join(", ")}]::text[])`,
          mentionNicknames,
        );
        // Get poster display name for notification
        const { rows: [poster] } = await pool.query(
          `SELECT COALESCE(nickname, NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), 'qualcuno') AS display_name FROM users WHERE id = $1`,
          [userId],
        );
        const posterName = poster?.display_name || "qualcuno";
        const snippet = plainContent.replace(/\s+/g, " ").trim().slice(0, 100);
        for (const mu of mentionedUsers) {
          if (mu.id === userId) continue; // don't notify yourself
          sendPushToUser(mu.id, {
            title: `@${posterName} ti ha menzionato`,
            body: snippet || "Hai una nuova menzione",
            url: `/feed`,
            tag: `mention-${newPost.id}`,
            category: "mentions",
          });
          // Also insert in-app notification
          pool.query(
            `INSERT INTO notifications (user_id, type, title, message, url) VALUES ($1, 'mention', $2, $3, $4)`,
            [mu.id, `@${posterName} ti ha menzionato`, snippet || "Hai una nuova menzione", `/feed`],
          ).catch(() => {});
        }
      } catch (e: any) {
        console.warn("[social] mention notifications failed:", e.message);
      }
    }
  });

  app.delete("/api/microblog/posts/:id", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const postId = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM microblog_posts WHERE id = $1 AND user_id = $2`, [postId, userId]);
    res.json({ deleted: true });
  });

  // Public feed: posts from people I follow + my own
  app.get("/api/microblog/feed", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const { rows } = await pool.query(`
      SELECT p.id, p.content, p.image_url, p.beer_id, p.pub_id, p.brewery_id, p.created_at,
             u.id AS user_id, u.nickname AS username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') AS display_name,
             u.profile_image_url,
             b.name AS beer_name, b.image_url AS beer_image,
             pb.name AS pub_name, pb.city AS pub_city,
             br.name AS brewery_name,
             (SELECT COUNT(*)::int FROM microblog_likes ml WHERE ml.post_id = p.id) AS likes_count,
             (SELECT COUNT(*)::int FROM microblog_comments mc WHERE mc.post_id = p.id) AS comments_count,
             EXISTS(SELECT 1 FROM microblog_likes ml2 WHERE ml2.post_id = p.id AND ml2.user_id = $1) AS liked
      FROM microblog_posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN beers b ON b.id = p.beer_id
      LEFT JOIN pubs pb ON pb.id = p.pub_id
      LEFT JOIN breweries br ON br.id = p.brewery_id
      WHERE p.user_id = $1 OR p.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
      ORDER BY p.created_at DESC
      LIMIT 60
    `, [userId]);
    res.json(rows);
  });

  // Posts filtered by tagged entity or hashtag (public)
  // ?taggedEntity=pub:42 | brewery:7 | beer:9 | event:pub:55 | event:brewery:55
  // ?hashtag=word
  // ?limit=20&offset=0
  app.get("/api/microblog/posts", async (req: any, res) => {
    const limit = Math.min(parseInt((req.query.limit as string) || "20", 10), 50);
    const offset = Math.max(parseInt((req.query.offset as string) || "0", 10), 0);
    const taggedEntity = (req.query.taggedEntity as string) || "";
    const hashtag = ((req.query.hashtag as string) || "").trim().toLowerCase().replace(/^#/, "");

    const where: string[] = [];
    const params: any[] = [];

    if (taggedEntity) {
      const parts = taggedEntity.split(":");
      const kind = parts[0];
      if (kind === "event" && parts.length === 3) {
        const sourceType = parts[1];
        const eid = parseInt(parts[2], 10);
        if (!Number.isFinite(eid) || !["pub", "brewery"].includes(sourceType)) {
          return res.status(400).json({ message: "taggedEntity non valido" });
        }
        params.push(eid, sourceType);
        where.push(`p.event_id = $${params.length - 1} AND p.event_source_type = $${params.length}`);
      } else if (parts.length === 2) {
        const eid = parseInt(parts[1], 10);
        if (!Number.isFinite(eid)) return res.status(400).json({ message: "taggedEntity non valido" });
        const col = kind === "pub" ? "pub_id"
                  : kind === "brewery" ? "brewery_id"
                  : kind === "beer" ? "beer_id"
                  : null;
        if (!col) return res.status(400).json({ message: "taggedEntity non valido" });
        params.push(eid);
        where.push(`p.${col} = $${params.length}`);
      } else {
        return res.status(400).json({ message: "taggedEntity non valido" });
      }
    }

    if (hashtag) {
      params.push(hashtag);
      where.push(`$${params.length} = ANY(p.hashtags)`);
    }

    if (where.length === 0) {
      return res.status(400).json({ message: "Specificare taggedEntity o hashtag" });
    }

    const viewerId: string | null = req.user?.id ?? null;
    const likedSelect = viewerId
      ? `EXISTS(SELECT 1 FROM microblog_likes ml2 WHERE ml2.post_id = p.id AND ml2.user_id = $${params.length + 1}) AS liked`
      : `FALSE AS liked`;
    if (viewerId) params.push(viewerId);
    params.push(limit, offset);

    const sql = `
      SELECT p.id, p.content, p.image_url, p.beer_id, p.pub_id, p.brewery_id,
             p.event_id, p.event_source_type, p.hashtags, p.created_at,
             u.id AS user_id, u.nickname AS username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') AS display_name,
             u.profile_image_url,
             b.name AS beer_name, b.image_url AS beer_image,
             pb.name AS pub_name, pb.city AS pub_city,
             br.name AS brewery_name,
             (SELECT COUNT(*)::int FROM microblog_likes ml WHERE ml.post_id = p.id) AS likes_count,
             (SELECT COUNT(*)::int FROM microblog_comments mc WHERE mc.post_id = p.id) AS comments_count,
             ${likedSelect}
      FROM microblog_posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN beers b ON b.id = p.beer_id
      LEFT JOIN pubs pb ON pb.id = p.pub_id
      LEFT JOIN breweries br ON br.id = p.brewery_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  });

  app.get("/api/microblog/discover", async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT p.id, p.content, p.image_url, p.created_at,
             u.id AS user_id, u.nickname AS username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') AS display_name,
             u.profile_image_url,
             (SELECT COUNT(*)::int FROM microblog_likes ml WHERE ml.post_id = p.id) AS likes_count,
             (SELECT COUNT(*)::int FROM microblog_comments mc WHERE mc.post_id = p.id) AS comments_count
      FROM microblog_posts p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    res.json(rows);
  });

  app.post("/api/microblog/posts/:id/like", isAuthenticated, async (req: any, res) => {
    const postId = parseInt(req.params.id, 10);
    await pool.query(
      `INSERT INTO microblog_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, req.user.id],
    );
    res.json({ liked: true });
  });

  app.delete("/api/microblog/posts/:id/like", isAuthenticated, async (req: any, res) => {
    const postId = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM microblog_likes WHERE post_id = $1 AND user_id = $2`, [postId, req.user.id]);
    res.json({ liked: false });
  });

  app.get("/api/microblog/posts/:id/comments", async (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const { rows } = await pool.query(`
      SELECT c.id, c.content, c.created_at,
             u.id AS user_id, u.nickname AS username,
             COALESCE(u.nickname, NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), ''), 'utente') AS display_name,
             u.profile_image_url
      FROM microblog_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
      LIMIT 100
    `, [postId]);
    res.json(rows);
  });

  app.post("/api/microblog/posts/:id/comments", isAuthenticated, async (req: any, res) => {
    const postId = parseInt(req.params.id, 10);
    const content = String(req.body?.content ?? "").trim().slice(0, 500);
    if (!content) return res.status(400).json({ message: "Commento vuoto" });
    const { rows } = await pool.query(
      `INSERT INTO microblog_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at`,
      [postId, req.user.id, content],
    );
    res.json(rows[0]);
  });

  // ─── ADMIN BROADCAST ──────────────────────────────────────────────────────
  app.get("/api/admin/broadcasts", isAuthenticated, isAdmin, async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT b.*, u.nickname AS sent_by_username
       FROM admin_broadcasts b
       LEFT JOIN users u ON u.id = b.sent_by
       ORDER BY b.created_at DESC LIMIT 50`,
    );
    res.json(rows);
  });

  app.post("/api/admin/broadcasts", isAuthenticated, isAdmin, async (req: any, res) => {
    const { title, body, url, imageUrl, audience } = req.body ?? {};
    if (!title || !body) return res.status(400).json({ message: "Titolo e testo obbligatori" });
    const aud = ["all", "publicans", "brewers", "admins"].includes(audience) ? audience : "all";

    let userIds: string[] = [];
    try {
      let q = `SELECT DISTINCT user_id AS id FROM push_subscriptions`;
      if (aud === "publicans")
        q = `SELECT DISTINCT ps.user_id AS id FROM push_subscriptions ps WHERE EXISTS (SELECT 1 FROM pubs p WHERE p.owner_id = ps.user_id)`;
      else if (aud === "brewers")
        q = `SELECT DISTINCT ps.user_id AS id FROM push_subscriptions ps WHERE EXISTS (SELECT 1 FROM breweries b WHERE b.owner_id = ps.user_id)`;
      else if (aud === "admins")
        q = `SELECT DISTINCT ps.user_id AS id FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id WHERE 'admin' = ANY(COALESCE(u.roles, ARRAY[]::text[])) OR u.active_role = 'admin'`;
      const { rows } = await pool.query(q);
      userIds = rows.map((r: any) => r.id);
    } catch (e) {
      const { rows } = await pool.query(`SELECT DISTINCT user_id AS id FROM push_subscriptions`);
      userIds = rows.map((r: any) => r.id);
    }

    let sent = 0;
    for (const uid of userIds) {
      try {
        await sendPushToUser(uid, {
          title, body,
          url: url || "/",
          image: imageUrl || undefined,
          tag: `admin-broadcast-${Date.now()}`,
          category: 'adminBroadcasts',
          type: 'admin_broadcast',
        });
        sent++;
      } catch {}
    }

    const ins = await pool.query(
      `INSERT INTO admin_broadcasts (title, body, url, image_url, audience, sent_by, sent_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, body, url || null, imageUrl || null, aud, req.user.id, sent],
    );
    res.json({ ...ins.rows[0], targetCount: userIds.length });
  });

  // ─── RSS NEWS (public) ────────────────────────────────────────────────────
  app.get("/api/news", async (req, res) => {
    const limit = Math.min(parseInt((req.query.limit as string) || "30", 10), 100);
    const { rows } = await pool.query(`
      SELECT i.id, i.title, i.link, i.summary, i.image_url, i.published_at,
             s.name AS source_name
      FROM rss_items i
      JOIN rss_sources s ON s.id = i.source_id
      ORDER BY i.published_at DESC NULLS LAST, i.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(rows);
  });

  app.get("/api/admin/rss-sources", isAuthenticated, isAdmin, async (_req, res) => {
    const { rows } = await pool.query(`SELECT * FROM rss_sources ORDER BY name`);
    res.json(rows);
  });

  app.post("/api/admin/rss-sources", isAuthenticated, isAdmin, async (req, res) => {
    const { name, url } = req.body ?? {};
    if (!name || !url) return res.status(400).json({ message: "Nome e URL obbligatori" });
    try {
      const { rows } = await pool.query(
        `INSERT INTO rss_sources (name, url) VALUES ($1, $2) RETURNING *`,
        [name, url],
      );
      res.json(rows[0]);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/admin/rss-sources/:id", isAuthenticated, isAdmin, async (req, res) => {
    await pool.query(`DELETE FROM rss_sources WHERE id = $1`, [parseInt(String(req.params.id), 10)]);
    res.json({ deleted: true });
  });

  app.post("/api/admin/rss-sources/refresh", isAuthenticated, isAdmin, async (_req, res) => {
    await fetchRssFeeds();
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM rss_items`);
    res.json({ ok: true, totalItems: rows[0].c });
  });

  console.log("[social] routes registered");
}
