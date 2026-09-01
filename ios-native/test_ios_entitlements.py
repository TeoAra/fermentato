#!/usr/bin/env python3
"""Test locale dei generatori/verificatori entitlement iOS."""

import plistlib
import shutil
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]

with tempfile.TemporaryDirectory() as tmp:
    app_root = Path(tmp) / "ios" / "App"
    project_dir = app_root / "App.xcodeproj"
    app_dir = app_root / "App"
    project_dir.mkdir(parents=True)
    app_dir.mkdir(parents=True)

    project = project_dir / "project.pbxproj"
    project.write_text(
        "SWIFT_VERSION = 5.0;\nSWIFT_VERSION = 5.0;\n", encoding="utf-8"
    )
    shutil.copy(
        root / "ios-template/App/App/Info.plist",
        app_dir / "Info.plist",
    )

    subprocess.run(
        [
            "python3",
            root / "ios-native/add_url_scheme.py",
            app_dir / "Info.plist",
            "fermentato",
            "to.fermentato.app",
        ],
        check=True,
    )
    subprocess.run(
        ["python3", root / "ios-native/add_push_entitlement.py", project],
        check=True,
    )
    subprocess.run(
        [
            "python3",
            root / "ios-native/add_apple_signin_entitlement.py",
            app_dir / "App.entitlements",
        ],
        check=True,
    )
    subprocess.run(
        [
            "python3",
            root / "ios-native/verify_ios_entitlements.py",
            project,
            app_dir / "App.entitlements",
            app_dir / "Info.plist",
            "to.fermentato.app",
        ],
        check=True,
    )

print("Test entitlement iOS superato")