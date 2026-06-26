---
name: iOS safe-area freeze (chrome jump on overlays)
description: Why fixed header/bottom-nav jump when popups open on iOS, and the frozen-CSS-var pattern that fixes it.
---

# iOS safe-area freeze — fixed chrome jumps when any overlay opens

**Symptom:** On iOS Capacitor/WKWebView, the fixed MobileHeader and BottomNavigation (and any
element padded with `env(safe-area-inset-*)`) visibly JUMP/FLASH whenever ANY popup/toast/dialog/
sheet opens or closes.

**Root cause:** WKWebView re-evaluates *live* `env(safe-area-inset-*)` when it creates a new GPU
layer (which happens on overlay open/close). Each re-eval can momentarily yield a different inset,
so every fixed/sticky element reading raw `env()` reflows by a few px. A `display:none` nav-hide
`:has()` CSS hack made it worse (the hide/show itself flashes).

**The fix (pattern, keep it consistent):**
1. Read the insets ONCE in JS (a dummy off-DOM element with `padding:env(...)`, read computed px)
   and write them to static CSS vars `--frozen-sat` / `--frozen-sab` (px strings, never `env()`).
   Defined in `index.css` with `env()` *defaults* so first paint (pre-JS) is still correct.
2. EVERY chrome-adjacent top/bottom usage must reference `var(--frozen-sat|sab)`, NOT raw `env()`.
   Left/right insets don't cause the vertical jump and can stay raw `env()`.
3. Sampling rule = **"max-non-zero wins"**: WKWebView exposes insets *late*, so early/transient `0`
   reads must NOT overwrite a notch already detected. Track the largest value seen and always write
   that. Only `orientationchange` may reset the memory (landscape legitimately has 0 top/bottom).
4. Don't hide the nav with `display:none` on overlay — that flashes. Layer modals ABOVE the nav via
   z-index instead (nav z-55; dialog/alert/sheet z-[60]; toast z-90; onboarding z-200; lightbox 9999).

**Why:** Apple-review-grade polish issue that recurred expensively; the freeze + single-source-of-truth
var is the only thing that fully stops it. **How to apply:** any new fixed/sticky/top-bottom-padded
chrome element must use the frozen vars; grep `env\(safe-area-inset-(top|bottom)` before shipping and
ensure every live hit is a frozen var (only readers/defaults/comments may keep raw `env()`).

**Gotcha when reading the inset in JS:** `getComputedStyle(root).getPropertyValue('--sat')` returns
the raw CSS token (e.g. the literal `env(safe-area-inset-top)`), NOT a px value. To get the real
pixels, create a dummy element with `padding-top:env(safe-area-inset-top)` and read its computed
`paddingTop`. The probe element must be **IN the viewport** (`position:fixed;top:0;left:0;width:1px;
height:1px;opacity:0;pointer-events:none`, appended to `document.body`) — an off-screen
`visibility:hidden` probe at `top:-9999px` on `<html>` returns `0` on some WKWebView builds, so the
freeze never gets a positive value. Also sample late and on lifecycle events (rAF + 80/250/750/1500/
3000ms timers, `load`, `visibilitychange`, first `pointerdown`/`touchstart`, Capacitor App `resume`):
some builds expose insets only after first layout / first touch / foreground resume.

## Refinement — NEVER write `0` (it clobbers the env() fallback → permanent overlap)

A separate user-reported overlap (header under the status bar / Dynamic Island, bottom dock under the
home indicator) came from `sample()` writing `--frozen-sat/sab` UNCONDITIONALLY, including `"0px"`.
Rule #3 ("max-non-zero wins") only protected an *already-detected* notch; at boot, before any notch
is seen, the first sample writes `0px` and that static 0 **clobbers the CSS `env()` default**. If the
hidden probe then keeps reading 0 (flaky on some WKWebView builds), the var is stuck at 0 forever and
the chrome overlaps permanently.

**Sharpened rule:** only `setProperty` a **positive** value (`if (val > 0) setProperty(...)`). Until a
positive reading exists, leave the var on its live `env()` default — correct position, at worst a
one-time micro-jump, never a permanent overlap. On `orientationchange`, `removeProperty` first (revert
to live env(), ~0 in landscape) then re-sample so portrait re-freezes the notch.

**Do NOT** "fix" this by switching consumers to `max(var(--frozen-sat), env(...))` — re-introducing
live `env()` into every chrome calc brings back the GPU-layer jump the freeze exists to prevent.

An overlap on a notched device proves the WebView IS edge-to-edge, so the real `env()` is non-zero —
only the probe read was wrong. If `env()` is genuinely 0 everywhere, the remaining fix is native
StatusBar/WebView config (NOT in this repo). All of this is web-layer → reaches the native app only
after a manual VPS deploy of fermenta.to.

## Refinement #2 — the JUMP comes back if the probe never reads positive (overlap fix's tradeoff)

The "never write 0" overlap fix has a tradeoff: if the probe reads 0 forever, the chrome stays on
live `env()`, and then the original GPU-layer JUMP returns whenever an overlay opens. A user reported
exactly this (header + bottom bar "si muove" on editing a menu item → opening a dialog/sheet). So the
overlap fix alone is not enough on probe-failing devices; ship all three together:
1. **Harden the probe** (see in-viewport probe + late/lifecycle sampling above) so the freeze actually
   gets a positive px and the chrome stops reading live `env()`.
2. **Kill transform animations on native.** Any transform-based enter/exit (Radix `zoom-in-95`,
   `slide-in-from-bottom`, etc.) creates a new GPU compositing layer → `env()` re-eval → jump. The
   repo already had `[data-capacitor="true"] .animate-in { animation:none; transform:none }` but it
   **missed Radix overlays**: their class is the Tailwind *variant* `data-[state=open]:animate-in`,
   not the plain `.animate-in`. Match the variant with `[class*="animate-in"]`/`[class*="animate-out"]`.
   (opacity-only fade is fine; only *transform* / new layers trigger the re-eval.)
3. **Never hard-unmount fixed chrome on modal open.** Even a `position:fixed` bar that occupies no
   layout flow causes a flash + re-render when unmounted/remounted mid-overlay-animation. Keep it
   mounted and hide via `opacity`/`pointer-events` (overlays at z-[60] cover chrome below anyway).

**Why:** the env() re-eval needs BOTH a live-`env()` consumer AND a new-GPU-layer trigger; removing
either stops the jump, so fixing the probe (removes consumer) and killing native transforms (removes
trigger) is belt-and-suspenders. **Avoid** `max(var(--frozen-sat), env())` as the primary fix — it
re-introduces a live-`env()` consumer.

## Refinement #3 — persist the inset to localStorage (probe must have worked ONCE, not every session)

The overlap kept recurring "ogni tanto" because the fix still depended on the probe reading a positive
value *this session*. On some WKWebView sessions the probe (and the `env()` consumer fallback) resolve
to 0 for the whole lifetime → `--frozen-sat` never gets a positive px → header sits under the status
bar. The robust web-only fix: **cache the last-known-good positive inset in localStorage and apply it
at boot, before the first sample.** The notch is constant per device, so once measured even once, the
header is correctly offset on every later boot even if the probe fails all session.
- Key by device + orientation: `fermenta.safeArea.v1.${p|l}.${screen.width}x${screen.height}.${dpr}`.
  `screen.width/height` are orientation-stable on iOS, so the `p`/`l` prefix is what separates
  portrait/landscape. Landscape has no cache entry → stays on `env()` live (~0, correct).
- Persist the **raw sane measurement** (not the in-session max) so the cache can self-correct DOWN if
  iOS ever changes the status-bar height; clamp to sane ranges (sat 1–100, sab 1–80) and never store 0.
- In-memory still uses "max-non-zero wins" within a session; cache only seeds `bestSat/sab` at boot
  and on `orientationchange` (removeProperty → applyCache(newKey) → resample).
- This does NOT re-introduce a live `env()` consumer, so it does not bring back the jump.
- **Probe hardening that mattered:** `z-index:-1` + `opacity:0` could make WebKit treat the probe as
  out-of-flow → 0 reads. Use `opacity:0.001; z-index:0` and force a reflow (`void el.offsetHeight`)
  before reading computed padding.
- Debug aid: gate `console.log` of measured/cached insets behind a `?sadebug` URL flag for on-device
  diagnosis in production (web-layer change → reaches native app only after a manual VPS deploy).

## Refinement #4 — a web-only fix CANNOT fully cover a fresh device whose env() is 0 all session

The cache (Refinement #3) only helps once the probe has read a positive value at least once. A brand-new
install (empty localStorage) on a device whose WKWebView reports `env(safe-area-inset-*)=0` for the entire
first session has nothing to fall back to → overlap. Confirmed reproduced on a fresh iPhone 17.
**Last-resort safety net (web-only):** when `Capacitor.isNativePlatform() && getPlatform()==='ios'` and the
probe+cache are still 0, apply a device-class estimate from the orientation-stable `screen` long/short ratio
(ratio ≥ 1.9 → notch/Dynamic Island → sat 59 / sab 34; else home-button → sat 20 / sab 0). Rules that keep it
safe: **portrait-only** (landscape insets are ~0), **never written to localStorage** (estimate ≠ measurement),
and it sets the CSS var WITHOUT mutating bestSat/bestSab so any later real `env()` measurement overwrites it
(corrects 59→44 down). Use the TALLEST value per class so it never *under*-pads (overlap); a few extra px on a
notch device is cosmetic and self-corrects.
**Why:** purely web-layer code can't read the true inset when WKWebView won't expose it; the only fully
reliable fix is native (a Capacitor StatusBar / safe-area plugin in the iOS project) — but the native project
is NOT in this repo, so the estimate is the best available web-only mitigation.

## Refinement #5 — the JUMP is a FIRST-PAINT problem; no timed fallback can beat it, only a synchronous pre-paint seed

Refinement #4's estimate ran on a *timer* (~400ms), so on a fresh device it fired AFTER the chrome had
already painted with inset 0 → the user still saw a visible 0→59 JUMP (re-reported on iPhone 17, both
native app and standalone PWA). The real mechanism: chrome is GPU-composited (`translateZ(0)` via
`.pwa-standalone .fixed` / `.bottom-nav-fixed`) and `--frozen-sat/sab` *default to `env()`*; inside a
composited layer WebKit resolves `env(safe-area-inset-*)` as **0 at first paint**, so frame 1 overlaps,
then the un-composited probe freezes the var to ~59px → jump. Any JS that runs *after* first paint is too
late by definition.
**Decisive cure:** seed `--frozen-sat/sab` to the device-class estimate **synchronously, before the chrome's
first paint**. Do it at the TOP of `main.tsx` *before* `createRoot().render()` — the chrome is React-rendered
(never in static HTML), so it always paints after that line, and there `Capacitor.isNativePlatform()` is
reliable. Do NOT rely on a `<head>` inline script for native detection: `window.Capacitor` /
`display-mode:standalone` / `navigator.standalone` are NOT reliably true for the Capacitor WKWebView in
`<head>`, so the native app would miss the seed.
- Factor the estimate into ONE shared module (`client/src/lib/safe-area-estimate.ts`) used by both the
  pre-seed and the App.tsx fallback, or the two drift. Gate edge-to-edge = native iOS **OR** (iOS-UA **AND**
  standalone PWA), portrait-only, never persisted; non-iOS/desktop/Android = no-op.
- Compatible with the probe: the probe never writes 0 and the fallback only sets when best==0, so neither
  clobbers the seed; a real positive sample still refines 59→44 on older notch devices (one-time, acceptable).
- Still web-layer → reaches the native app only after a manual VPS deploy; verify on-device with `?sadebug`.

## Refinement #6 — the freeze protects the PERSISTENT header; page-level sticky/fixed bars are separate "impostors"

A user reported the header "si alza" (rises under the status bar) after a search→beer→Home flow. Don't
assume it's the persistent global MobileHeader: it is rendered OUTSIDE the keyed route-fade `<Switch>`, so it
is never remounted on navigation; there is NO transform/`will-change` trap on `.main-content-wrapper`; and the
ONLY code that clears `--frozen-sat/sab` is `resampleFromScratch()` on `orientationchange`. So a static px
lock genuinely PERSISTS across SPA navigation and the persistent header does not lose its padding in-flow.
**Suspect instead page-level chrome that ignores the offset:**
- A page's own sub-header at `sticky top-0` slides UNDER the global fixed header on scroll (the global header
  occupies `0..var(--mobile-top-offset)`). Fix: `sticky top-[var(--mobile-top-offset)] lg:top-16`.
- A `fixed top-16` overlay (hardcoded desktop 4rem header height) ignores `--frozen-sat` on notched devices.
  Fix: `fixed top-[var(--mobile-top-offset)] lg:top-16`.

**How to apply:** any page-level sticky/fixed bar meant to sit below the global header must anchor to
`var(--mobile-top-offset)` on mobile (= `calc(3.5rem + var(--frozen-sat))`, and `4rem` at the `lg` breakpoint),
never `top-0`/`top-16`. Pre-release grep `sticky top-0`, `fixed top-16`, and raw `env(safe-area-inset-top)` in
chrome-adjacent UI. Note the Replit iOS-app preview has `isIosEdgeToEdge()===false` (freeze disabled) and
anchors `position:fixed` to the full document in screenshots → it's an UNRELIABLE mirror of on-device behavior.

## Refinement #7 — header/dock DETACH on modal CLOSE is a stale-scroll composite layer, NOT a frozen-var bug

A user reported the global header AND the bottom dock both shift UPWARD (header under the status bar, dock lifts
off the bottom with a gap) specifically AFTER closing a Radix Sheet/Dialog (editing a drink in the pub
dashboard). This is a DIFFERENT failure mode from the env() jump: the frozen vars are untouched. Cause: the
fixed chrome is GPU-composited (`translateZ(0)`), and when a Radix overlay's `react-remove-scroll` toggles body
scroll-lock **open→closed**, iOS WKWebView leaves the composited layer painted at the document's *stale scrolled
offset* instead of re-anchoring to the viewport. So it detaches only on overlay CLOSE, and stays wrong until some
later reflow.
**Cure:** a one-frame "repaint" of ONLY the composited chrome, fired on the modal open→close edge, gated to
`isIosEdgeToEdge()`. Toggle the chrome's `transform` from `translateZ(0)` → `none` (+`will-change:auto`) for a
single frame via a `<html>` class, force a reflow (`void offsetHeight`), then rAF-remove the class. WebKit drops
& recreates the layer, re-anchored to the viewport. `transform:none` and `translateZ(0)` paint at the SAME pixel
position, so the repaint is invisible on already-correct chrome — it only snaps the wrong→correct case.
**Keep these invariants:** the repaint CSS must mirror the EXACT existing compositing selectors (native header =
`[data-capacitor="true"] header`; docks = `.bottom-nav-fixed`; PWA = `.pwa-standalone .fixed` + inline
`position:fixed` variants) so it covers precisely the stuck-able set and needs zero per-element marking — and so a
NON-composited element (e.g. a semantic `<header>` in PWA) is never needlessly repainted. Schedule via double-rAF
(+ a ~180ms timeout fallback for slow PWA exit animations); detect the open→close edge with a `useRef`; call the
hook ONCE at App level. Do NOT instead drop `translateZ(0)` permanently (re-introduces the env() jump), change
the Radix scroll-lock strategy, or touch `--frozen-sat/sab`. Web-layer → reaches the native app only after a
manual VPS deploy.

## Refinement #8 — the detach is GLOBAL: trigger off ANY new composite layer, target an explicit marker, not modal-close

Refinement #7's modal-close-only repaint was too narrow: a user still saw the header AND dock detach after editing a
FOOD menu item **AND a notification arriving** — i.e. the stranding fires on layers that are NOT a black-backdrop Radix
overlay (toasts, popovers, selects, tooltips, push/in-app notifications, fade-in dashboard mini-bars). The modal-close
edge detector (`useAnyModalOpen` open→close) never sees those, so the chrome stayed stranded.
**Cure (supersedes #7's narrow trigger):** make re-anchoring GLOBAL and continuous, not event-specific.
1. **Mark, don't selector-match.** Add ONE explicit class `.ios-fixed-chrome` to every PERSISTENT fixed chrome
   (global `<header>`, all dashboard top mini-bars, docks already have `.bottom-nav-fixed`). Repaint targets ONLY
   `html.fix-chrome-repaint .ios-fixed-chrome, html.fix-chrome-repaint .bottom-nav-fixed`. **Drop the broad
   `.pwa-standalone .fixed` / `[style*=position:fixed]` from the repaint selector** — it swept in transient
   overlays/toasts and risked glitching their OWN enter/exit animations mid-flight. Persistent-chrome-only = safe.
2. **Give the marker a baseline `transform:translateZ(0)`** in CSS. The frosted mini-bars (`backdrop-blur-xl` on an
   inner div) had NO transform on the outer fixed wrapper, so `transform:none` would have been a no-op (nothing to
   toggle → no layer recreate → no re-anchor). Baseline translateZ(0) makes `transform:none` a REAL layer toggle.
3. **Trigger off everything that can spawn/destroy a composite layer**, funneled through a debounce
   (~110ms trailing + ~420ms max-wait) so sustained activity re-anchors periodically without a reflow per event:
   `MutationObserver(document.body, {childList, attributes/class})` (NO `subtree` → avoids #root re-render noise),
   document **capture** listeners for `animation{start,end,cancel}` + `transition{run,end,cancel}`, `window`
   resize/orientationchange/pageshow, `document` visibilitychange, and throttled `visualViewport` resize/scroll.
   `kick()` = add `.fix-chrome-repaint`, `void offsetHeight`, rAF-remove. Full listener/timer/rAF cleanup on unmount.
**Why marker over selector:** the stuck set is the *persistent* chrome, which is a small, explicitly-known list; a
broad attribute selector both over-covers (transient overlays) and under-covers (an un-composited wrapper has no
transform to toggle). An explicit marker + baseline composite is precise on both axes. **Why global trigger:** the
detach is caused by *any* new GPU layer re-anchoring the viewport-fixed layers to a stale scroll offset, not by modals
specifically — so the correct dependency is "a layer changed", observed broadly, not "a modal closed". Keep #7's pixel
invariant (transform:none ≡ translateZ(0) → invisible on correct chrome) and the `isIosEdgeToEdge()` gate. Still
web-layer → reaches the native app only after a manual VPS deploy; mobile-Safari (non-standalone) dev testing is a
no-op because `isIosEdgeToEdge()` is false there.

## Refinement #9 — in-app toast ("pill nera") + push: add eventless-dismiss bursts and a pointerdown safety net

User re-hit the detach on the pub Taplist after changing a tap beer when the small black IN-APP notification (the
custom `Toaster` pill, `bg-gray-900`) appeared. That pill is a child of a PERSISTENT container (always-mounted, static
`translateZ(0)` + `contain:layout style paint`), animated only by inline `opacity` transition. So #8's `transition{run,end}`
capture listeners DO fire on fade-in/out — but two gaps remain: (a) the pill's UNMOUNT after the ~3.5s auto-dismiss
changes the childList of the persistent container, NOT of `document.body`, so the `subtree:false` MutationObserver misses
it; (b) a native push banner re-composites with no DOM event at all.
**Additions (belt-and-suspenders over #8, same `schedule()`/`kick()` machinery):**
1. Listen on `window` for the CustomEvents `capacitor-native.ts` already dispatches — `native-push-received`,
   `native-push-action`, `native-app-resume` — and on each fire a staggered BURST (`schedule()` now + setTimeouts at
   ~400/1200/2600/4000ms) to cover both the appearance and the EVENTLESS auto-dismiss/banner-slide-away. No-op on web
   (events never emitted there).
2. **`document.addEventListener("pointerdown", schedule, true)`** — the definitive safety net: whatever stranded the
   chrome (toast, banner, any eventless re-composite), the user's very next touch re-anchors it. Cheap (debounced, one
   schedule per gesture) and invisible on already-correct chrome.
Clean up all three window listeners, the pointerdown capture listener, and the burst timers on unmount. Still web-layer →
reaches the native app only after a manual VPS deploy, so it cannot be validated on-device until fermenta.to is redeployed.

## Refinement #10 — ROOT CAUSE: the chrome's OWN compositing is the bug; de-composite it on native (supersedes #7–#9 there)

Decisive fact that broke the loop: the user confirmed they DO deploy each fix (`sudo fermenta-deploy`), so #7/#8/#9 WERE live on-device and the detach STILL reproduced. So the repaint/re-anchor strategy was empirically failing, not just untested. The repaint treats the symptom but then **restores the exact failure condition** (`translateZ(0)`), and with `will-change:transform` active WebKit keeps the layer alive so the one-frame `transform:none` often never forces a real teardown/re-anchor → no-op.
**Real cause:** only viewport-fixed **GPU-composited** layers get re-anchored by WKWebView to a stale scroll offset when another layer is created/destroyed. A normally-painted `position:fixed` element does NOT. So the chrome's own `translateZ(0)`/`will-change:transform` IS what makes it strandable.
**Why the compositing was even there no longer holds on NATIVE:** (a) the env() 0-at-first-paint jump is already prevented by the frozen static px vars (`--frozen-sat/sab`, not live env()); (b) the address-bar show/hide jitter it guarded against does not exist in a Capacitor WKWebView (no Safari chrome). So on native the compositing is pure liability.
**Fix (the real one):** stop compositing the fixed chrome on iOS native — CSS scoped to `[data-platform="ios"]` (set on `<html>` in `main.tsx`, native-only, so Android & desktop untouched): override `header`, `.bottom-nav-fixed`, `.ios-fixed-chrome` with `transform:none !important; -webkit-transform:none !important; will-change:auto !important; backface-visibility:visible !important`. `!important` wins over the base composite rules AND over `.pwa-standalone .fixed`. No composited layer ⇒ nothing to strand ⇒ no detach, and the whole repaint machinery becomes unnecessary on native.
**Also gate the repaint hook OFF on native:** `useReanchorIosFixedChrome` now `return`s early when `isNativeApp` (from `client/src/lib/platform.ts`), right after the `isIosEdgeToEdge()` guard. The MutationObserver/pointerdown/transition reflows can themselves perturb WebKit, and native no longer needs them. The hook (and all #7–#9 triggers) now runs ONLY for iOS PWA standalone / mobile Safari, where the chrome is still composited (`.pwa-standalone .fixed` kept) and the repaint is still the chosen mechanism.
**This REVERSES the #7 invariant "Do NOT drop translateZ(0) permanently (re-introduces the env() jump)":** that warning predates everything being on frozen px. With frozen px, dropping the chrome's compositing does NOT bring back the env() jump. The invariant still holds for any element that reads LIVE `env()`; the chrome doesn't anymore.
**On-device validation (after `sudo fermenta-deploy` + hard-close/reopen the iOS app):** pub dashboard → change a tap beer → wait for the toast to appear AND auto-dismiss; watch for: no header/status-bar overlap on first paint, no dock bottom gap, no 0→59 safe-area jump, and no visible fixed-bar jitter while scrolling. If the toast STILL strands the chrome, the next step is to also drop `translateZ(0)` from the toast container itself (it has a static one) — but only after confirming chrome de-compositing first. If only the PWA regresses, the PWA path is untouched by this change.

## Refinement #11 — DEFINITIVE: the in-app toast itself is the trigger; kill its layer + move the notification OUT of the WebView on native

#10 (de-composite the chrome on `[data-platform="ios"]`) was DEPLOYED and the user confirmed it was live on-device — and the detach STILL reproduced when the in-app toast pill appeared (changing a beer photo). That empirically DISPROVES the "#10 assumption" that only composited fixed elements get re-anchored: with the chrome de-composited, vars frozen to static px (pre-seed in `main.tsx` sets `--frozen-sat:59px`/`--frozen-sab:34px` inline on a Dynamic-Island device in portrait — so it is NOT a live-`env()` re-eval), the dock portaled to `document.body` (no transformed ancestor), and the repaint hook off on native, the chrome still moved.
**Durable principle (the real root cause):** in WKWebView, creating/destroying ANY composited layer re-anchors **all** `position:fixed` elements to a stale scroll offset — even non-composited ones. So de-compositing only the chrome can't be enough; you must remove the layer-toggling TRIGGER. The trigger that survived 10 refinements was the toast: its container had a static `translateZ(0)` + `contain:layout style paint` (its own GPU layer) and each pill animated `opacity` (WebKit promotes an opacity transition to a temporary composited layer, then tears it down).
**Two-layer fix:**
1. Web-bundle mitigation (ships via `sudo fermenta-deploy`, reaches the EXISTING installed app on reload — no native rebuild): on iOS native only, the HTML toast creates NO layer — drop `translateZ(0)` + `contain:paint` from the container and set the pill `transition:none` (instant show/hide). Gated by `isIosNative` in `toaster.tsx`. Not categorically guaranteed (WKWebView can still promote a `position:fixed`+z-index+shadow box), so treat as mitigation/validation, not the final word.
2. Definitive (needs `@capacitor/toast` plugin + a LOCAL native rebuild — the native project isn't in this repo): render the notification with the OS-native toast on iOS native instead of an HTML overlay, so the notification lives OUTSIDE the WebView and physically can't toggle a WebView layer or re-anchor fixed chrome. Wired in `use-toast.ts` `toast()`: if `isIosNative && Capacitor.isPluginAvailable("Toast")` and the toast has no `action` and only plain-text title/description → `Toast.show()` and return a no-op handle; otherwise fall back to the (now de-composited) HTML toast. `isPluginAvailable` is the key: builds WITHOUT the plugin (every currently-installed app) return false → HTML fallback, so nothing breaks pre-rebuild. Action/undo toasts and non-string React content stay HTML (an OS toast is text-only). Scoped to iOS only on purpose — Android WebView doesn't have this bug, so its branded HTML pill is left untouched.
**Why this is the better alternative the user asked for:** stop guessing at WebView compositing internals (10 CSS refinements failed); the notification is the trigger, so move it out of the web layer entirely. If #1 alone still jumps before the rebuild, the remaining stopgap is to SUPPRESS HTML toasts on iOS native until the native-toast build ships.

## Refinement #12 — web-only stopgap when the native build can't ship: stable-node pill + visibility-only toggle

Context: the user could NOT rebuild the iOS app (Codemagic blocked by an Apple App Store Connect agreement 403 — see ios-build-codemagic.md), so the DEFINITIVE native-toast fix (#11 part 2) cannot reach the device; only web-bundle changes can (deploy + reload). #11 part 1 (de-composite the HTML toast) reportedly STILL jumped.
**Stronger web-only insight (the real lever is layer/subtree CHURN, not just compositing):** with TOAST_LIMIT=1 and `key={id}`, EVERY new toast unmounts the old pill subtree and mounts a new one — and opacity 0↔1 can promote/demote a temporary layer. Both are create/destroy events that re-anchor position:fixed chrome in WKWebView, which is exactly the "ANY layer create/destroy" trigger from #11.
**Fix:** on iOS native render ONE pill with a STABLE identity (separate `IosPersistentPill`, NOT keyed by toast id), ALWAYS mounted from app start; switch ONLY `visibility: hidden|visible` (never mount/unmount, never opacity transition, no translateZ/contain). The DOM node is born once; only its content + visibility change → no layer is ever created or destroyed → nothing to re-anchor. Scoped via `if (isIosNative) return <IosPersistentPill/>` in `Toaster`; web/PWA/Android keep the previous mapped-pills container untouched.
**Status/honesty:** this is the strongest WEB-ONLY mitigation; the guaranteed end of the jump is still the native OS toast (#11 part 2), which needs the build unblocked. If even this still jumps, next steps are an app-shell layout (body non-scrollable, only an inner div scrolls, so fixed chrome has no document scroll offset to re-anchor to) or suppressing HTML toasts on iOS native entirely until the native build ships.

**Descendant churn also removed (same refinement):** `IosPersistentPill` renders a FULLY stable inner skeleton — icon slot with BOTH icons toggled via `display`, plus always-present title/description/action nodes. Only text content, `display`, className and the outer `visibility` change, so NO node inside the fixed subtree mounts/unmounts either (the architect's remaining caveat). If even this still jumps on-device, escalate to the app-shell layout.
