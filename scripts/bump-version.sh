#!/bin/bash
# ───────────────────────────────────────────────────────────────────────────
# scripts/bump-version.sh
# Incrementa la versione con carryover: 1.0.9 → 1.1.0, 1.9.9 → 2.0.0
# Sincronizza version.json + app-version.ts. Usato da build-apk.sh e build-ios-prep.sh.
# ───────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION_FILE="$ROOT/version.json"
APP_VERSION_FILE="$ROOT/client/src/lib/app-version.ts"

if [ ! -f "$VERSION_FILE" ]; then
  echo '{"version": "1.0.0"}' > "$VERSION_FILE"
fi

CURRENT=$(node -e "process.stdout.write(require('$VERSION_FILE').version)")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
MAJOR=${MAJOR:-1}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}

# Incremento con carryover: patch 0-9, minor 0-9
PATCH=$((PATCH + 1))
if [ "$PATCH" -gt 9 ]; then
  PATCH=0
  MINOR=$((MINOR + 1))
  if [ "$MINOR" -gt 9 ]; then
    MINOR=0
    MAJOR=$((MAJOR + 1))
  fi
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "{\"version\": \"$NEW_VERSION\"}" > "$VERSION_FILE"

cat > "$APP_VERSION_FILE" << TSEOF
// ───────────────────────────────────────────────────────────────────────────
// Versione corrente dell'app (APK Android + iOS).
// Auto-aggiornata da scripts/bump-version.sh ad ogni build.
// ───────────────────────────────────────────────────────────────────────────
export const APP_VERSION = "$NEW_VERSION";
TSEOF

echo "$NEW_VERSION"
