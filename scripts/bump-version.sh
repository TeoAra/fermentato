#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/bump-version.sh
# Incrementa il patch version in version.json e sincronizza app-version.ts.
# Chiamato automaticamente dall'hook post-merge sul VPS.
# ─────────────────────────────────────────────────────────────────────────────
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
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "{\"version\": \"$NEW_VERSION\"}" > "$VERSION_FILE"

cat > "$APP_VERSION_FILE" << TSEOF
// ─────────────────────────────────────────────────────────────────────────────
// Versione corrente dell'APK Android.
// Auto-aggiornata da scripts/bump-version.sh ad ogni deploy sul VPS.
// ─────────────────────────────────────────────────────────────────────────────
export const APP_VERSION = "$NEW_VERSION";
TSEOF

echo "✅ Versione aggiornata: $CURRENT → $NEW_VERSION"
