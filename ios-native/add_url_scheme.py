#!/usr/bin/env python3
"""Aggiunge uno URL scheme custom a Info.plist in modo idempotente."""

import plistlib
import sys
from pathlib import Path

if len(sys.argv) not in (3, 4):
    raise SystemExit(
        "Usage: add_url_scheme.py <Info.plist> <scheme> [url-name]"
    )

path = Path(sys.argv[1])
scheme = sys.argv[2]
url_name = sys.argv[3] if len(sys.argv) == 4 else scheme

if not path.is_file():
    raise SystemExit(f"ERRORE: Info.plist non trovato: {path}")

with path.open("rb") as handle:
    info = plistlib.load(handle)

url_types = info.setdefault("CFBundleURLTypes", [])
if any(scheme in item.get("CFBundleURLSchemes", []) for item in url_types):
    print(f"URL scheme {scheme} già presente in {path}")
    raise SystemExit(0)

url_types.append({
    "CFBundleURLName": url_name,
    "CFBundleURLSchemes": [scheme],
})

with path.open("wb") as handle:
    plistlib.dump(info, handle, fmt=plistlib.FMT_XML, sort_keys=False)

print(f"URL scheme {scheme} aggiunto a {path}")