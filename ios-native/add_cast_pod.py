#!/usr/bin/env python3
"""
Aggiunge un pod al Podfile iOS in modo robusto, indipendentemente dal formato.

sed fallisce silenziosamente se il pattern non matcha (es. Podfile senza
'capacitor_pods' o '# Add your Pods here'). Questo script usa regex Python
per trovare il blocco 'target App do ... end' e inserire il pod prima della
chiusura 'end', garantendo che il pod sia sempre nel target corretto.

Usage:
    python3 ios-native/add_cast_pod.py <Podfile> <pod_name>

Esempio:
    python3 ios-native/add_cast_pod.py ios/App/Podfile "google-cast-sdk"
"""
import sys
import re

path     = sys.argv[1]
pod_name = sys.argv[2]

txt = open(path).read()

if pod_name in txt:
    print(f"'{pod_name}' già presente nel Podfile — skip")
    sys.exit(0)

# Strategia 1: trova 'target 'App' do ... end' e inserisce il pod prima di 'end'
# re.DOTALL per matchare newline nel mezzo del blocco
m = re.search(r"(target\s+'App'\s+do\b)(.*?)(\nend\b)", txt, re.DOTALL)
if m:
    # Inserisce prima del '\nend'
    insert_pos = m.start(3)
    txt = txt[:insert_pos] + f"\n  pod '{pod_name}'" + txt[insert_pos:]
    open(path, "w").write(txt)
    print(f"✅ '{pod_name}' aggiunto nel blocco 'target App do'")
    sys.exit(0)

# Strategia 2: appende in fondo al file come fallback
txt += f"\npod '{pod_name}'\n"
open(path, "w").write(txt)
print(f"⚠️  '{pod_name}' aggiunto in fondo al Podfile (fallback — blocco target non trovato)")
