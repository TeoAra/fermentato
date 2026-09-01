#!/usr/bin/env bash
set -euo pipefail

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
MANIFEST="$TMP_DIR/AndroidManifest.xml"

cat > "$MANIFEST" <<'XML'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <activity
      android:name=".MainActivity"
      android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
      </intent-filter>
    </activity>
  </application>
</manifest>
XML

bash scripts/patch-android-app-links.sh "$MANIFEST" fermenta.to
bash scripts/patch-android-app-links.sh "$MANIFEST" fermenta.to

[[ "$(grep -c 'FERMENTA_APP_LINKS: verified' "$MANIFEST")" -eq 1 ]]
grep -q 'android:autoVerify="true"' "$MANIFEST"
grep -q 'android:host="fermenta.to"' "$MANIFEST"
grep -q 'android:scheme="fermentato"' "$MANIFEST"

echo "Test patch App Links superato"