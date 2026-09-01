---
name: Deep links (apri app da link fermenta.to)
description: Vincoli non ovvi per identificatori, firma Play e build native dei deep link
---
Android e iOS hanno identificatori diversi: Android usa `to.fermenta.app`, iOS usa `to.fermentato.app`. Non riutilizzare un unico bundle id nei file well-known.

**Perché:** il progetto Android viene rigenerato da Capacitor partendo dall'id iOS; senza normalizzazione dopo ogni sync, manifest, namespace e package possono divergere. Inoltre Play firma gli AAB installati con il certificato Play App Signing, non necessariamente con la chiave upload.

**Come applicare:** dopo ogni `cap sync android`, applicare e verificare in modo bloccante package e intent-filter. In produzione configurare `ANDROID_CERT_SHA256` con il fingerprint Play App Signing (più eventuali firme aggiuntive, separate da virgola); non considerare valido il solo certificato upload/debug.
