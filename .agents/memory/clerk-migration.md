---
name: Clerk auth migration
description: How auth was migrated from custom Passport to Clerk; hybrid approach for mobile compat; bridge column; config location.
---

## What was migrated
Custom Passport (email/password + Google OAuth + Apple native) → Clerk.

## Bridge column
`users.id` (varchar nanoid, primary key). Clerk stores it as `externalId` for migrated users; `sessionClaims.userId` returns this original ID on every request. JIT provisioning in `server/auth.ts` (`getOrCreateDbUser`) creates a row on first Clerk sign-in if missing.

## Key files
- `server/auth.ts` — rewritten; exports `isAuthenticated`, `isAdmin`, `isAdminOrBreweryOwner`, `isPubOwner`, `hashPassword`, `setupAuth`. Auth routes removed (register, login, OAuth, verify-email, forgot-password, reset-password); business routes kept (check-nickname, check-pub-slug, /api/auth/user, complete-onboarding, become-publican).
- `server/middlewares/clerkProxyMiddleware.ts` — proxies `/api/__clerk` to Clerk FAPI (production only, before body parsers).
- `server/index.ts` — mounts Clerk proxy before webhooks; mounts `clerkMiddleware()` after body parsers.
- `client/src/hooks/useAuth.ts` — compatibility shim: Clerk hooks + `/api/auth/user` query for DB fields (roles, managedPubId, etc.). Returns same interface `{ user, isLoading, isAuthenticated }` so 56 consumer files required no changes.
- `client/src/App.tsx` — `ClerkWrapper` (binds ClerkProvider to Wouter navigation) + `ClerkCacheInvalidator` (invalidates react-query on sign-out). Added `/sign-in` and `/sign-up` routes; `/login`, `/auth`, `/reset-password` redirect to `/sign-in`.
- `client/src/pages/sign-in.tsx`, `sign-up.tsx` — Clerk `<SignIn>` / `<SignUp>` with custom appearance.
- `client/src/lib/clerkAppearance.ts` — shared Clerk appearance config (amber/stone palette, Poppins font).

## Hybrid approach for native mobile
`server/native-auth.ts` still uses `passport.serializeUser`/`req.login()` for Capacitor native Google/Apple sign-in. The `resolveUser()` function checks Clerk session first, then falls back to `req.isAuthenticated()` (passport session). This keeps the iOS/Android app working during the Clerk transition. When the mobile app updates to use Clerk's Capacitor SDK, the passport fallback can be removed.

## Auth configuration
Use the **Auth pane** in the Replit workspace toolbar — there is NO external Clerk dashboard. All login providers (Google, Apple, email), branding, and OAuth credentials are configured there.

**Why:** The Replit Clerk integration is white-labelled; the standard dashboard doesn't apply.

## Logout
Server `POST /api/auth/logout` revokes the Clerk session via Backend API + clears passport session. The Clerk `ClerkCacheInvalidator` component in `App.tsx` also clears the react-query cache on sign-out.

## Packages added
`@clerk/express @clerk/shared http-proxy-middleware @clerk/react @clerk/themes` (all in root package.json).
