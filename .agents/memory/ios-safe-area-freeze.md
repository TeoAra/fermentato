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
pixels, create a dummy off-DOM element with `padding-top:env(safe-area-inset-top)` and read its
computed `paddingTop`.
