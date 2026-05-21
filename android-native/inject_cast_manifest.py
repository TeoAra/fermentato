#!/usr/bin/env python3
"""Inietta CastOptionsProvider metadata nel AndroidManifest.xml di Capacitor.

Usage:
    inject_cast_manifest.py <AndroidManifest.xml> [<package_name>]

Se package_name non è fornito, usa 'to.fermentato.app' (legacy — NON
corretto per Fermenta Android dove il pkg è to.fermenta.app).

IMPORTANTE: lo script è SEMPRE-CORRECT — se il meta-data è già presente
ma con FQN diverso, lo riscrive. Altrimenti build successive con un
package sbagliato (es. legacy to.fermentato.app) restano "incollati"
nel manifest e la Cast SDK lancia ClassNotFoundException.
"""
import sys
import re

path = sys.argv[1]
pkg = sys.argv[2] if len(sys.argv) > 2 else "to.fermenta.app"
txt = open(path).read()
correct_fqn = f"{pkg}.CastOptionsProvider"

# Rimuovi ogni meta-data OPTIONS_PROVIDER_CLASS_NAME esistente (in qualunque
# forma/spaziatura), così possiamo reinserirlo SEMPRE col valore giusto.
# Pattern: <meta-data ... OPTIONS_PROVIDER_CLASS_NAME ... />
pattern = re.compile(
    r"\s*<meta-data\b[^>]*OPTIONS_PROVIDER_CLASS_NAME[^>]*/>",
    re.DOTALL,
)
removed = len(pattern.findall(txt))
txt = pattern.sub("", txt)

meta = (
    "\n        <meta-data"
    '\n            android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"'
    f'\n            android:value="{correct_fqn}" />'
)
txt = re.sub(r"(<application\b[^>]*>)", r"\1" + meta, txt, count=1)
open(path, "w").write(txt)

if removed:
    print(
        f"CastOptionsProvider: rimosse {removed} occorrenza/e stale, "
        f"reinserito con FQN={correct_fqn}"
    )
else:
    print(f"CastOptionsProvider aggiunto a AndroidManifest (FQN={correct_fqn})")
