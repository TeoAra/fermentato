// Tests e2e per la verifica che gli account sospesi non possano bypassare il blocco.
//
// Esegui con:
//   npx tsx --test tests/suspension.test.ts
//
// I test sono di due categorie:
//
// A) Unit tests dell'isAuthenticated middleware (copertura rapida di tutti i branch).
//
// B) End-to-end HTTP tests con sessione Passport reale (cookie-based):
//    - Login → session cookie → suspend in DB → stesso cookie → assert 403
//    - Unsuspend in DB → stesso cookie → assert 200
//    Questi verificano che deserializeUser faccia una fresh DB read a ogni request,
//    rendendo impossibile il bypass tramite refresh di sessione.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Request, Response, NextFunction } from "express";
import express from "express";
import { pool, db } from "../server/db";
import { setupAuth, hashPassword, isAuthenticated } from "../server/auth";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// ─── Helpers shared by all tests ─────────────────────────────────────────────

const TEST_PREFIX = "test-susp-";
const testUserId = `${TEST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const testEmail = `${testUserId}@test.local`;
const testPassword = "Test1234!";

async function createTestUser(id: string, email: string, password: string) {
  const hashed = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (id, email, user_type, nickname, is_email_verified, roles, active_role, hashed_password)
     VALUES ($1, $2, 'customer', $3, true, ARRAY['customer'], 'customer', $4)
     ON CONFLICT (id) DO NOTHING`,
    [id, email, id, hashed],
  );
}

async function cleanupTestUser(id: string) {
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}

async function getUserFromDb(id: string): Promise<Record<string, unknown>> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user as unknown as Record<string, unknown>;
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

before(async () => {
  await createTestUser(testUserId, testEmail, testPassword);
  await pool.query(`UPDATE users SET suspended_until = NULL WHERE id = $1`, [testUserId]);
});

after(async () => {
  await cleanupTestUser(testUserId);
});

// ═══════════════════════════════════════════════════════════════════════════════
// A) UNIT TESTS — isAuthenticated middleware branch coverage
// ═══════════════════════════════════════════════════════════════════════════════

/** Mock req with req.isAuthenticated() returning true and req.user = user. */
function mockReq(user: Record<string, unknown> | null, method: string): Request {
  return {
    isAuthenticated: () => !!user,
    user: user ?? undefined,
    method,
    headers: {},
    get: () => undefined,
  } as unknown as Request;
}

/** Mock res that captures statusCode and JSON body. */
function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = { statusCode: 200, body: null as unknown } as Response & {
    statusCode: number;
    body: unknown;
  };
  (res as any).status = (code: number) => { res.statusCode = code; return res; };
  (res as any).json = (data: unknown) => { res.body = data; return res; };
  return res;
}

test("unit: active suspension blocks POST with 403 + suspended fields", async () => {
  await pool.query(
    `UPDATE users SET suspended_until = $1 WHERE id = $2`,
    [new Date(Date.now() + 60 * 60 * 1000), testUserId],
  );
  const user = await getUserFromDb(testUserId);
  const req = mockReq(user, "POST");
  const res = mockRes();
  let nextCalled = false;
  isAuthenticated(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false, "next() must NOT be called for a suspended user");
  assert.equal(res.statusCode, 403);
  assert.equal((res.body as any)?.suspended, true);
  assert.ok((res.body as any)?.suspendedUntil, "suspendedUntil must be set in response");
});

test("unit: 403 body includes a future suspendedUntil date", async () => {
  await pool.query(
    `UPDATE users SET suspended_until = $1 WHERE id = $2`,
    [new Date(Date.now() + 2 * 60 * 60 * 1000), testUserId],
  );
  const user = await getUserFromDb(testUserId);
  const res = mockRes();
  isAuthenticated(mockReq(user, "POST"), res, () => {});

  const body = res.body as any;
  assert.equal(body?.suspended, true);
  const until = new Date(body?.suspendedUntil);
  assert.ok(!isNaN(until.getTime()), "suspendedUntil must be a valid date");
  assert.ok(until > new Date(), "suspendedUntil must be in the future");
});

test("unit: expired suspension (past date) allows next()", async () => {
  await pool.query(
    `UPDATE users SET suspended_until = $1 WHERE id = $2`,
    [new Date(Date.now() - 2000), testUserId],
  );
  const user = await getUserFromDb(testUserId);
  const res = mockRes();
  let nextCalled = false;
  isAuthenticated(mockReq(user, "POST"), res, () => { nextCalled = true; });
  assert.equal(nextCalled, true, "Expired suspension must not block the request");
});

test("unit: GET requests are never blocked by suspension", async () => {
  await pool.query(
    `UPDATE users SET suspended_until = $1 WHERE id = $2`,
    [new Date(Date.now() + 60 * 60 * 1000), testUserId],
  );
  const user = await getUserFromDb(testUserId);
  for (const method of ["GET", "HEAD", "OPTIONS"] as const) {
    const res = mockRes();
    let nextCalled = false;
    isAuthenticated(mockReq(user, method), res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `${method} must not be blocked`);
  }
});

test("unit: all write methods (POST/PUT/PATCH/DELETE) are blocked", async () => {
  await pool.query(
    `UPDATE users SET suspended_until = $1 WHERE id = $2`,
    [new Date(Date.now() + 60 * 60 * 1000), testUserId],
  );
  const user = await getUserFromDb(testUserId);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
    const res = mockRes();
    let nextCalled = false;
    isAuthenticated(mockReq(user, method), res, () => { nextCalled = true; });
    assert.equal(nextCalled, false, `${method} must be blocked`);
    assert.equal(res.statusCode, 403);
    assert.equal((res.body as any)?.suspended, true);
  }
});

test("unit: NULL suspended_until (unsuspended) allows next()", async () => {
  await pool.query(`UPDATE users SET suspended_until = NULL WHERE id = $1`, [testUserId]);
  const user = await getUserFromDb(testUserId);
  const res = mockRes();
  let nextCalled = false;
  isAuthenticated(mockReq(user, "POST"), res, () => { nextCalled = true; });
  assert.equal(nextCalled, true, "Unsuspended user must pass through");
});

// ═══════════════════════════════════════════════════════════════════════════════
// B) END-TO-END HTTP TESTS — real Passport session (cookie-based)
//
// These tests start a real Express server with:
//   - getSession() (connect-pg-simple, same store as production)
//   - passport.initialize() + passport.session()
//   - The real deserializeUser callback (fresh DB SELECT on every request)
//   - A custom /test-login endpoint that calls req.login() directly (no reCAPTCHA)
//   - A protected POST /test-write endpoint guarded by isAuthenticated
//
// By using a real session cookie across requests, deserializeUser is called on
// every request — this is the invariant that prevents suspended users from
// bypassing the block by simply refreshing their session.
// ═══════════════════════════════════════════════════════════════════════════════

/** Build the minimal test Express app once; reuse across all e2e tests. */
async function buildTestApp(): Promise<http.Server> {
  const app = express();
  app.use(express.json());

  // Use the PRODUCTION auth setup — this registers the real deserializeUser callback
  // (fresh DB SELECT on every request) along with the session store and passport
  // middleware stack. Tests then exercise the same code path as production.
  await setupAuth(app);

  // Test-only login endpoint: looks up user by id and calls req.login() directly.
  // Bypasses reCAPTCHA — used only in this test environment.
  app.post("/test-login", async (req: any, res) => {
    const { userId } = req.body as { userId: string };
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ message: "User not found" });
    req.login(user, (err: any) => {
      if (err) return res.status(500).json({ message: "Login error" });
      res.json({ ok: true });
    });
  });

  // Protected write endpoint — the route being tested
  app.post("/test-write", isAuthenticated, (_req, res) => {
    res.json({ ok: true });
  });

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

/** Convenience wrapper: POST to the test server, return status + body + Set-Cookie header. */
async function post(
  base: string,
  path: string,
  body: Record<string, unknown>,
  cookie?: string,
): Promise<{ status: number; body: any; setCookie: string | null }> {
  const resp = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const setCookie = resp.headers.get("set-cookie");
  const text = await resp.text();
  let parsedBody: any;
  try { parsedBody = JSON.parse(text); } catch { parsedBody = text; }
  return { status: resp.status, body: parsedBody, setCookie };
}

/** Extract just the session cookie value from a Set-Cookie header string. */
function extractSessionCookie(setCookie: string | null): string {
  if (!setCookie) throw new Error("No Set-Cookie header");
  // The header can be a comma-separated list; take the first key=value part
  return setCookie.split(";")[0];
}

// Single server instance shared across e2e tests
let server: http.Server;
let base: string;

test("e2e setup: test server starts and login works", async () => {
  server = await buildTestApp();
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;

  // Ensure user is not suspended before we start
  await pool.query(`UPDATE users SET suspended_until = NULL WHERE id = $1`, [testUserId]);

  const { status, body, setCookie } = await post(base, "/test-login", { userId: testUserId });
  assert.equal(status, 200, `Login must return 200, got ${status}: ${JSON.stringify(body)}`);
  assert.ok(setCookie, "Login must return a session cookie");
});

test("e2e: active session passes write request when not suspended", async () => {
  // Ensure clean state
  await pool.query(`UPDATE users SET suspended_until = NULL WHERE id = $1`, [testUserId]);

  // Login to get a session cookie
  const login = await post(base, "/test-login", { userId: testUserId });
  const cookie = extractSessionCookie(login.setCookie);

  // Write request with active session → should succeed
  const { status } = await post(base, "/test-write", {}, cookie);
  assert.equal(status, 200, "Write request must succeed when not suspended");
});

test("e2e: suspension is enforced immediately on the next request (same session cookie)", async () => {
  // Step 1: login → session cookie
  await pool.query(`UPDATE users SET suspended_until = NULL WHERE id = $1`, [testUserId]);
  const login = await post(base, "/test-login", { userId: testUserId });
  const cookie = extractSessionCookie(login.setCookie);

  // Step 2: first write request passes
  const before = await post(base, "/test-write", {}, cookie);
  assert.equal(before.status, 200, "Request before suspension must return 200");

  // Step 3: admin suspends the user in DB (same as POST /api/admin/users/:id/suspend)
  const suspendedUntil = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(`UPDATE users SET suspended_until = $1 WHERE id = $2`, [suspendedUntil, testUserId]);

  // Step 4: SAME session cookie — deserializeUser re-reads DB → suspended user → 403
  const after = await post(base, "/test-write", {}, cookie);
  assert.equal(after.status, 403, "Request after DB suspension must return 403 (same cookie)");
  assert.equal(after.body?.suspended, true, "Response must include suspended: true");
  assert.ok(after.body?.suspendedUntil, "Response must include suspendedUntil");
});

test("e2e: 403 response includes suspendedUntil (future date) and suspended=true", async () => {
  const suspendedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await pool.query(`UPDATE users SET suspended_until = $1 WHERE id = $2`, [suspendedUntil, testUserId]);

  const login = await post(base, "/test-login", { userId: testUserId });
  const cookie = extractSessionCookie(login.setCookie);
  const { status, body } = await post(base, "/test-write", {}, cookie);

  assert.equal(status, 403);
  assert.equal(body?.suspended, true);
  assert.ok(body?.suspendedUntil, "suspendedUntil must be present");
  const until = new Date(body.suspendedUntil);
  assert.ok(!isNaN(until.getTime()), "suspendedUntil must be a valid ISO date");
  assert.ok(until > new Date(), "suspendedUntil must be in the future");
});

test("e2e: block is lifted on next request after DELETE /suspend (suspended_until = NULL)", async () => {
  // Start suspended
  await pool.query(
    `UPDATE users SET suspended_until = $1 WHERE id = $2`,
    [new Date(Date.now() + 60 * 60 * 1000), testUserId],
  );

  const login = await post(base, "/test-login", { userId: testUserId });
  const cookie = extractSessionCookie(login.setCookie);

  // Confirm blocked
  const blocked = await post(base, "/test-write", {}, cookie);
  assert.equal(blocked.status, 403, "Must be blocked while suspended");

  // Admin lifts suspension (same as DELETE /api/admin/users/:id/suspend)
  await pool.query(`UPDATE users SET suspended_until = NULL WHERE id = $1`, [testUserId]);

  // SAME cookie → deserializeUser re-reads DB → no suspension → 200
  const unblocked = await post(base, "/test-write", {}, cookie);
  assert.equal(unblocked.status, 200, "Must be unblocked after suspension removed (same cookie)");
  assert.ok(unblocked.body?.ok, "Response body must be { ok: true }");
});

test("e2e teardown: close test server", async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});
