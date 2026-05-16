#!/usr/bin/env python3
"""
Inietta i metodi delegate APNs nell'AppDelegate.swift di Capacitor.

Senza questi metodi il plugin @capacitor/push-notifications non riceve
mai il device token, l'evento `registration` lato JS non si attiva e
nessun token viene salvato nel backend.

Riferimento ufficiale Capacitor:
https://capacitorjs.com/docs/apis/push-notifications#ios

Usage:
    python3 ios-native/inject_push_appdelegate.py <path/to/AppDelegate.swift>
"""
import sys
import re

path = sys.argv[1]
txt = open(path).read()

# Idempotenza: marker univoco per il blocco di badge clearing. Lo usiamo per
# evitare doppia iniezione (sia degli APNs callback sia del badge reset).
APNS_MARKER  = "didRegisterForRemoteNotificationsWithDeviceToken"
BADGE_MARKER = "// FERMENTA_BADGE_RESET"

badge_body = (
    "        " + BADGE_MARKER + "\n"
    "        if #available(iOS 16.0, *) {\n"
    "            UNUserNotificationCenter.current().setBadgeCount(0) { _ in }\n"
    "        } else {\n"
    "            application.applicationIconBadgeNumber = 0\n"
    "        }\n"
    "        UNUserNotificationCenter.current().removeAllDeliveredNotifications()\n"
)

apns_block = """
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
"""

new_method_block = (
    "\n    // Azzera il badge rosso sull'icona quando l'utente apre/riprende l'app, e\n"
    "    // rimuove le notifiche già consegnate dal Notification Center.\n"
    "    func applicationDidBecomeActive(_ application: UIApplication) {\n"
    + badge_body +
    "    }\n"
)

needs_apns  = APNS_MARKER  not in txt
needs_badge = BADGE_MARKER not in txt

if not needs_apns and not needs_badge:
    print("APNs + badge reset gia' presenti in AppDelegate — skip")
    sys.exit(0)

# ── APNs callbacks ─────────────────────────────────────────────────────────
if needs_apns:
    m = list(re.finditer(r"\n\}\s*$", txt))
    if not m:
        print("ERRORE: impossibile trovare la chiusura della classe AppDelegate")
        sys.exit(1)
    last = m[-1]
    txt = txt[:last.start()] + apns_block + txt[last.start():]
    print("APNs delegate methods iniettati")

# ── Badge reset ────────────────────────────────────────────────────────────
# Se esiste già un applicationDidBecomeActive (es. da template Capacitor o da
# un altro inject), iniettiamo SOLO il blocco di reset badge in cima al corpo
# del metodo esistente — così non causiamo "invalid redeclaration".
# Altrimenti aggiungiamo il metodo completo prima della chiusura della classe.
if needs_badge:
    existing = re.search(
        r"(func\s+applicationDidBecomeActive\s*\([^)]*\)\s*\{\n)",
        txt
    )
    if existing:
        insert_at = existing.end()
        txt = txt[:insert_at] + badge_body + txt[insert_at:]
        print("Badge reset iniettato dentro applicationDidBecomeActive esistente")
    else:
        m = list(re.finditer(r"\n\}\s*$", txt))
        if not m:
            print("ERRORE: impossibile trovare la chiusura della classe AppDelegate")
            sys.exit(1)
        last = m[-1]
        txt = txt[:last.start()] + new_method_block + txt[last.start():]
        print("applicationDidBecomeActive con badge reset aggiunto")

open(path, "w").write(txt)
print("inject_push_appdelegate.py completato")
