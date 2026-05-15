#!/usr/bin/env python3
"""
Aggiunge post_install hook al Podfile iOS per risolvere problemi di
compilazione Swift con Xcode 16+.

Problemi risolti:
  - SWIFT_STRICT_CONCURRENCY=minimal → CapacitorGeolocation/IONGeolocationLib
    fallisce con "actors cannot be used in code that must be compatible with
    older OS versions" su Xcode 16.3 (Swift strict concurrency attivato di default)
  - IPHONEOS_DEPLOYMENT_TARGET uniforme per tutti i pod (evita warning/errori
    di SDK mismatch quando la platform del Podfile è più alta del target singolo pod)

Usage:
    python3 ios-native/add_podfile_hooks.py ios/App/Podfile
"""
import sys

path = sys.argv[1]
txt  = open(path).read()

if "post_install" in txt:
    print("post_install hook già presente nel Podfile — skip")
    sys.exit(0)

hook = """
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Xcode 16+ abilita Swift strict concurrency per default:
      # alcune dipendenze (IONGeolocationLib, google-cast-sdk) non sono ancora
      # aggiornate e falliscono la compilazione. 'minimal' ripristina il
      # comportamento di Xcode 15 senza modificare il codice sorgente.
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      # Allinea il deployment target di tutti i pod a quello del progetto
      # per evitare avvisi di incompatibilità SDK durante l'archivio.
      min_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if min_target.nil? || min_target.to_f < 14.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
      end
    end
  end
end
"""

open(path, "a").write(hook)
print("✅ post_install hook aggiunto al Podfile (SWIFT_STRICT_CONCURRENCY=minimal)")
