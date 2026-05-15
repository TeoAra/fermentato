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

if "didRegisterForRemoteNotificationsWithDeviceToken" in txt:
    print("APNs delegate methods gia' presenti in AppDelegate — skip")
    sys.exit(0)

push_block = """
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
"""

# Inserisci prima dell'ultima parentesi graffa di chiusura della classe AppDelegate.
# Match: ultima '}' in fondo al file (chiusura della classe).
m = list(re.finditer(r"\n\}\s*$", txt))
if not m:
    print("ERRORE: impossibile trovare la chiusura della classe AppDelegate")
    sys.exit(1)

last = m[-1]
new_txt = txt[:last.start()] + push_block + txt[last.start():]
open(path, "w").write(new_txt)
print("APNs delegate methods iniettati in AppDelegate.swift")
