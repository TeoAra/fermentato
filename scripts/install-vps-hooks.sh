#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/install-vps-hooks.sh
# Installa il git post-merge hook sul VPS: dopo ogni `git pull` viene
# incrementata la versione, ricompilata l'app e riavviato pm2.
#
# Eseguire UNA SOLA VOLTA sul VPS:
#   cd /www/nodeapps/fermenta && bash scripts/install-vps-hooks.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOK="$ROOT/.git/hooks/post-merge"

cat > "$HOOK" << 'HOOKEOF'
#!/bin/bash
# Auto-generato da install-vps-hooks.sh — NON MODIFICARE MANUALMENTE
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
echo "── post-merge: bump versione, build, restart ──"
bash scripts/bump-version.sh
npm run build
pm2 restart fermenta
echo "✅ Deploy completato"
HOOKEOF

chmod +x "$HOOK"
echo "✅ Hook installato: $HOOK"
echo "   Da ora in poi, ogni 'git pull' incrementerà la versione e riavvierà l'app."
