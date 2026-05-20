#!/usr/bin/env python3
"""Inietta CastOptionsProvider metadata nel AndroidManifest.xml di Capacitor.

Usage:
    inject_cast_manifest.py <AndroidManifest.xml> [<package_name>]

Se package_name non è fornito, usa 'to.fermentato.app' (legacy).
"""
import sys
import re

path = sys.argv[1]
pkg = sys.argv[2] if len(sys.argv) > 2 else "to.fermentato.app"
txt = open(path).read()

if "CastOptionsProvider" in txt:
    print(f"CastOptionsProvider già presente in AndroidManifest — skip")
    sys.exit(0)

meta = (
    "\n        <meta-data"
    '\n            android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"'
    f'\n            android:value="{pkg}.CastOptionsProvider" />'
)

txt = re.sub(r"(<application\b[^>]*>)", r"\1" + meta, txt, count=1)
open(path, "w").write(txt)
print(f"CastOptionsProvider aggiunto a AndroidManifest (package={pkg})")
