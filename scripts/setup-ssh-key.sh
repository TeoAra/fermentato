#!/bin/bash
# Ripristina la chiave SSH dal segreto VPS_SSH_KEY
# Da eseguire all'inizio di ogni sessione prima di usare sync-beers-to-vps.sh

if [ -z "$VPS_SSH_KEY" ]; then
  echo "❌ Segreto VPS_SSH_KEY non trovato. Aggiungilo nelle Secrets di Replit."
  exit 1
fi

mkdir -p ~/.ssh
echo "$VPS_SSH_KEY" > ~/.ssh/id_replit_sync
chmod 600 ~/.ssh/id_replit_sync

# Verifica che sia una chiave privata valida
if ! head -1 ~/.ssh/id_replit_sync | grep -q "BEGIN"; then
  echo "❌ VPS_SSH_KEY non sembra una chiave privata valida."
  echo "   Deve iniziare con: -----BEGIN OPENSSH PRIVATE KEY-----"
  rm ~/.ssh/id_replit_sync
  exit 1
fi

echo "✓ Chiave SSH ripristinata correttamente"
