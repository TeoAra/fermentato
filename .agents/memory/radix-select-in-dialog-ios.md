---
name: Radix Select inside Dialog on iOS
description: Dropdown selects inside modals don't open on native iOS WKWebView — use direct chips
---
Rule: on native iOS (Capacitor/WKWebView), a Radix/shadcn `<Select>` rendered inside a `<Dialog>`/`<Sheet>` can fail to open its menu entirely — the popup never appears and the dialog card visually "jumps" — while working fine on web.

**Why:** user-reported on the Crea Nuovo Evento dialog (Categoria select). Portal+popper layers inside a modal interact badly with WKWebView and this app's `[data-capacitor]` animation overrides.

**How to apply:** for small option sets inside dialogs, replace the dropdown with direct tap chips/buttons (see `CategoryPicker` in events-manager.tsx) — no portal, no floating layer. Any remaining Select-in-Dialog on native iOS should be verified on device before shipping.
