#!/bin/bash
# Ripristina la chiave SSH dal segreto VPS_SSH_KEY
# Da eseguire all'inizio di ogni sessione prima di usare sync-beers-to-vps.sh

if [ -z "$VPS_SSH_KEY" ]; then
  echo "❌ Segreto VPS_SSH_KEY non trovato. Aggiungilo nelle Secrets di Replit."
  exit 1
fi

mkdir -p ~/.ssh

# Ricostruisce la chiave con il formato OpenSSH corretto (Replit collassa i newline)
node -e "
const key = process.env.VPS_SSH_KEY;
const match = key.match(/-----BEGIN OPENSSH PRIVATE KEY-----(.*?)-----END OPENSSH PRIVATE KEY-----/s);
if (!match) { console.error('Chiave non valida'); process.exit(1); }
const body = match[1].replace(/\s+/g, '');
const lines = body.match(/.{1,70}/g).join('\n');
const finalKey = '-----BEGIN OPENSSH PRIVATE KEY-----\n' + lines + '\n-----END OPENSSH PRIVATE KEY-----\n';
require('fs').writeFileSync('/home/runner/.ssh/id_replit_sync', finalKey, {mode: 0o600});
"

if ! ssh-keygen -y -f ~/.ssh/id_replit_sync > /dev/null 2>&1; then
  echo "❌ Chiave SSH non valida. Controlla il valore di VPS_SSH_KEY."
  exit 1
fi

echo "✓ Chiave SSH ripristinata correttamente"
