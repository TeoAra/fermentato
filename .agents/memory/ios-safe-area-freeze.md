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
