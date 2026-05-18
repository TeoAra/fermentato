#!/usr/bin/env python3
"""
Aggiunge un nome classe Swift/ObjC al packageClassList di capacitor.config.json
iOS-generato. Capacitor 8 NON fa auto-discovery via ObjC runtime: legge i nomi
classe da questo array (vedi node_modules/@capacitor/ios/Capacitor/Capacitor/
CapacitorBridge.swift @ line 305-335). Lo script ufficiale `cap copy ios`
popola la lista scannando SOLO i plugin in node_modules — i plugin in-app
(come il nostro NativeCast in scripts/) devono essere aggiunti manualmente
dopo `cap copy`.

Usage:
    python3 add_to_package_classlist.py <capacitor.config.json> <ClassName> [<ClassName2> ...]
"""
import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1

    cfg_path = Path(sys.argv[1])
    class_names = sys.argv[2:]

    if not cfg_path.exists():
        print(f"ERROR: {cfg_path} non esiste")
        return 1

    cfg = json.loads(cfg_path.read_text())
    existing = cfg.get("packageClassList", [])
    if not isinstance(existing, list):
        print(f"ERROR: packageClassList non e' una lista: {type(existing)}")
        return 1

    added = []
    for name in class_names:
        if name not in existing:
            existing.append(name)
            added.append(name)

    cfg["packageClassList"] = existing
    cfg_path.write_text(json.dumps(cfg, indent="\t"))

    if added:
        print(f"OK: aggiunti {added} a packageClassList ({len(existing)} totali)")
    else:
        print(f"OK: nessuna aggiunta (gia' presenti). Totale: {len(existing)}")
    print(f"packageClassList = {existing}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
