#!/usr/bin/env python3
"""Inietta CastOptionsProvider metadata nel AndroidManifest.xml di Capacitor."""
import sys
import re

path = sys.argv[1]
txt = open(path).read()

if "CastOptionsProvider" in txt:
    print("CastOptionsProvider già presente in AndroidManifest — skip")
    sys.exit(0)

meta = (
    "\n        <meta-data"
    '\n            android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"'
    '\n            android:value="to.fermentato.app.CastOptionsProvider" />'
)

# Inserisce dopo il tag <application ...> (prima della prima riga interna)
txt = re.sub(r"(<application\b[^>]*>)", r"\1" + meta, txt, count=1)
open(path, "w").write(txt)
print("CastOptionsProvider aggiunto a AndroidManifest")
