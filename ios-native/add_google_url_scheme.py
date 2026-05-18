#!/usr/bin/env python3
"""
Aggiunge il reversed Google OAuth URL scheme al Info.plist iOS.

Il Google Sign-In SDK iOS apre Safari con un URL custom e si aspetta che
l'app sia registrata per gestire il reverse del client ID come URL scheme.
Senza questo, il callback dopo il login Google non torna mai all'app.

Reverse format: il client ID
   131123139785-stv42sugd3i1u0lb3u0jssoink746n81.apps.googleusercontent.com
diventa
   com.googleusercontent.apps.131123139785-stv42sugd3i1u0lb3u0jssoink746n81

Usa PlistBuddy via subprocess (stesso pattern del codemagic.yaml esistente).

Usage:
    python3 add_google_url_scheme.py <path/to/Info.plist> <reversed_url_scheme>
"""
import sys
import subprocess

if len(sys.argv) < 3:
    print(__doc__)
    sys.exit(1)

plist = sys.argv[1]
scheme = sys.argv[2]


def run(cmd: str, ignore_err: bool = False) -> tuple[int, str]:
    result = subprocess.run(
        ["/usr/libexec/PlistBuddy", "-c", cmd, plist],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 and not ignore_err:
        print(f"WARN: '{cmd}' -> {result.stderr.strip()}")
    return result.returncode, (result.stdout + result.stderr).strip()


# Verifica se già presente nello stesso array CFBundleURLTypes
rc, out = run("Print :CFBundleURLTypes", ignore_err=True)
if rc == 0 and scheme in out:
    print(f"URL scheme {scheme} gia' presente — skip")
    sys.exit(0)

# Crea CFBundleURLTypes array se non esiste
run("Add :CFBundleURLTypes array", ignore_err=True)

# Aggiunge un nuovo dict in fondo all'array (index dipende dai dict esistenti)
# Trova prossimo indice libero
idx = 0
while True:
    rc, _ = run(f"Print :CFBundleURLTypes:{idx}", ignore_err=True)
    if rc != 0:
        break
    idx += 1

run(f"Add :CFBundleURLTypes:{idx} dict")
run(f"Add :CFBundleURLTypes:{idx}:CFBundleURLName string GoogleSignIn")
run(f"Add :CFBundleURLTypes:{idx}:CFBundleURLSchemes array")
run(f"Add :CFBundleURLTypes:{idx}:CFBundleURLSchemes:0 string {scheme}")

print(f"OK: aggiunto URL scheme {scheme} a {plist} (index {idx})")
run("Print :CFBundleURLTypes")
