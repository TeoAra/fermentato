#!/usr/bin/env python3
"""
Aggiunge un file .swift al progetto Xcode (pbxproj) senza aprire Xcode.

Necessario perché `cp file.swift ios/App/App/` non è sufficiente:
Xcode compila solo i file elencati in PBXSourcesBuildPhase.
Senza questa iniezione NativeCast.swift viene ignorato dal compilatore
e il simbolo NativeCastPlugin non esiste → il plugin Capacitor non si registra.

Usage:
    python3 ios-native/add_swift_to_xcode.py <project.pbxproj> <Filename.swift>
"""
import sys
import re
import hashlib

def make_uuid(seed: str) -> str:
    """UUID deterministico a 24 caratteri hex uppercase, idempotente."""
    return hashlib.md5(seed.encode()).hexdigest()[:24].upper()

def main():
    if len(sys.argv) < 3:
        print("Usage: add_swift_to_xcode.py <project.pbxproj> <Filename.swift>")
        sys.exit(1)

    pbxproj  = sys.argv[1]
    filename = sys.argv[2]

    txt = open(pbxproj).read()

    if f"path = {filename};" in txt:
        print(f"{filename} già presente in {pbxproj} — skip")
        sys.exit(0)

    file_ref_uuid   = make_uuid(f"FileRef:{filename}")
    build_file_uuid = make_uuid(f"BuildFile:{filename}")

    # ── 1. PBXFileReference ───────────────────────────────────────────────────
    file_ref_entry = (
        f"\t\t{file_ref_uuid} /* {filename} */ = "
        f"{{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; "
        f"path = {filename}; sourceTree = \"<group>\"; }};\n"
    )
    txt = re.sub(
        r"(/\* End PBXFileReference section \*/)",
        file_ref_entry + r"\1",
        txt,
    )

    # ── 2. PBXBuildFile ───────────────────────────────────────────────────────
    build_file_entry = (
        f"\t\t{build_file_uuid} /* {filename} in Sources */ = "
        f"{{isa = PBXBuildFile; fileRef = {file_ref_uuid} /* {filename} */; }};\n"
    )
    txt = re.sub(
        r"(/\* End PBXBuildFile section \*/)",
        build_file_entry + r"\1",
        txt,
    )

    # ── 3. Aggiungi al gruppo App (accanto ad AppDelegate.swift) ──────────────
    txt = re.sub(
        r"(/\* AppDelegate\.swift \*/,)",
        r"\1\n\t\t\t\t" + file_ref_uuid + f" /* {filename} */,",
        txt,
        count=1,
    )

    # ── 4. Aggiungi a PBXSourcesBuildPhase ───────────────────────────────────
    txt = re.sub(
        r"(/\* AppDelegate\.swift in Sources \*/,)",
        r"\1\n\t\t\t\t" + build_file_uuid + f" /* {filename} in Sources */,",
        txt,
        count=1,
    )

    open(pbxproj, "w").write(txt)
    print(
        f"✅ {filename} aggiunto a {pbxproj} "
        f"(FileRef={file_ref_uuid}, BuildFile={build_file_uuid})"
    )

if __name__ == "__main__":
    main()
