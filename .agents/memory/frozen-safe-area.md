---
name: Frozen safe area (iOS)
description: How to correctly read and freeze env(safe-area-inset-*) on iOS WebKit/Capacitor — getPropertyValue on custom props returns raw token, not resolved px.
---

## Rule

To freeze `env(safe-area-inset-*)` as static pixel values for iOS WebKit jank prevention, you **must** read the resolved value via a dummy element's computed padding — NOT via `getPropertyValue('--sat')`.

## Why

`getComputedStyle(el).getPropertyValue('--sat')` returns the **token string** `"env(safe-area-inset-top, 0px)"` — not a resolved pixel value. When you then do `element.style.setProperty('--frozen-sat', thatString)`, iOS WebKit does **not** resolve `env()` inside inline-style custom properties. Result: `--frozen-sat` becomes effectively `0px` (fallback of env()), collapsing the header onto the status bar and the bottom nav onto the home indicator.

## How to apply

Read via a temp element's standard CSS property instead:

```javascript
const el = document.createElement('div');
el.style.cssText =
  'position:fixed;top:-9999px;left:-9999px;pointer-events:none;visibility:hidden;' +
  'padding-top:env(safe-area-inset-top,0px);' +
  'padding-bottom:env(safe-area-inset-bottom,0px);';
document.documentElement.appendChild(el);
const sat = parseFloat(getComputedStyle(el).paddingTop) || 0;   // → 59 (number)
const sab = parseFloat(getComputedStyle(el).paddingBottom) || 0; // → 34
document.documentElement.removeChild(el);
// Only set if valid — don't override CSS default with 0
if (sat > 0) document.documentElement.style.setProperty('--frozen-sat', sat + 'px');
if (sab > 0) document.documentElement.style.setProperty('--frozen-sab', sab + 'px');
```

`paddingTop` (a regular property) is fully resolved by the browser to px — returns `"59px"` not `"env(...)"`.

## Retry

Call once immediately + once after 80ms: Capacitor/WKWebView sometimes exposes safe area insets only after the first layout pass, so the first read may be 0.

## CSS fallbacks

Keep `--frozen-sat: env(safe-area-inset-top, 0px)` and `--frozen-sab: env(safe-area-inset-bottom, 0px)` in `:root` in index.css. These act as correct fallbacks if JS hasn't run yet (SSR/first paint). The JS freeze overrides them once it reads valid values.

## Location

`App.tsx` — `freezeSafeArea` useEffect.
