#!/usr/bin/env node
/**
 * Genera splash screen native per Android e iOS.
 * Sovrascrive il logo di default Capacitor (X blu) con il logo Fermenta.to.
 * - iOS: usa resources/splash.png (2732x2732) come Splash.imageset universale.
 * - Android: compone resources/icon.png centrato su sfondo bianco per ogni densità.
 * Salta automaticamente la piattaforma assente (build iOS-only o Android-only).
 * Usato da build-apk.sh (Android), build-ios-prep.sh e codemagic.yaml (iOS).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ICON_PATH = path.resolve('resources/icon.png');
const SPLASH_PATH = path.resolve('resources/splash.png');
const ANDROID_RES = path.resolve('android/app/src/main/res');
const IOS_APP_DIR = path.resolve('ios/App/App');
const IOS_ASSETS = path.resolve('ios/App/App/Assets.xcassets/Splash.imageset');

// Colori sfondo — allineati a capacitor.config.ts (bianco)
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

// Android portrait densities (w x h)
const ANDROID_PORTRAIT = [
  { dir: 'drawable-mdpi',     w: 320,  h: 480 },
  { dir: 'drawable-hdpi',     w: 480,  h: 800 },
  { dir: 'drawable-xhdpi',    w: 720,  h: 1280 },
  { dir: 'drawable-xxhdpi',   w: 960,  h: 1600 },
  { dir: 'drawable-xxxhdpi',  w: 1280, h: 1920 },
];

// Android landscape densities
const ANDROID_LANDSCAPE = [
  { dir: 'drawable-land-mdpi',     w: 480,  h: 320 },
  { dir: 'drawable-land-hdpi',     w: 800,  h: 480 },
  { dir: 'drawable-land-xhdpi',    w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi',   w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi',  w: 1920, h: 1280 },
];

async function compositeSplash(iconBuf, width, height, outPath) {
  // L'icona occupa ~30% della larghezza minore tra W e H
  const iconTarget = Math.round(Math.min(width, height) * 0.30);
  const resized = await sharp(iconBuf)
    .resize(iconTarget, iconTarget, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  await sharp({
    create: { width, height, channels: 4, background: BG }
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 6 })
    .toFile(outPath);
}

async function generateAndroid(iconBuf) {
  for (const s of [...ANDROID_PORTRAIT, ...ANDROID_LANDSCAPE]) {
    const dir = path.join(ANDROID_RES, s.dir);
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, 'splash.png');
    await compositeSplash(iconBuf, s.w, s.h, out);
    console.log(`  ✅ ${s.dir}/splash.png (${s.w}x${s.h})`);
  }
}

async function generateIOS(iconBuf) {
  const size = 2732;

  // Pulizia: rimuove l'imageset di default Capacitor (X blu) prima di riscrivere.
  fs.rmSync(IOS_ASSETS, { recursive: true, force: true });
  fs.mkdirSync(IOS_ASSETS, { recursive: true });

  let splashBuf;
  if (fs.existsSync(SPLASH_PATH)) {
    // Splash Fermenta.to a piena risoluzione (2732x2732): usalo direttamente,
    // appiattendo eventuale trasparenza su bianco e forzando la dimensione esatta.
    splashBuf = await sharp(SPLASH_PATH)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .flatten({ background: BG })
      .png({ compressionLevel: 6 })
      .toBuffer();
    console.log(`  ✅ ios/Splash.imageset/splash.png (da resources/splash.png, ${size}x${size})`);
  } else {
    // Fallback: componi il logo (icon.png) centrato su sfondo bianco.
    const iconTarget = Math.round(size * 0.25);
    const resized = await sharp(iconBuf)
      .resize(iconTarget, iconTarget, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    splashBuf = await sharp({
      create: { width: size, height: size, channels: 4, background: BG }
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png({ compressionLevel: 6 })
      .toBuffer();
    console.log(`  ✅ ios/Splash.imageset/splash.png (logo composito da icon.png, ${size}x${size})`);
  }

  fs.writeFileSync(path.join(IOS_ASSETS, 'splash.png'), splashBuf);

  // Contents.json per Xcode — singola immagine universale.
  const contents = {
    images: [
      { filename: 'splash.png', idiom: 'universal', scale: '1x' }
    ],
    info: { author: 'xcode', version: 1 }
  };
  fs.writeFileSync(
    path.join(IOS_ASSETS, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
  console.log(`  ✅ ios/Splash.imageset/Contents.json`);
}

async function main() {
  if (!fs.existsSync(ICON_PATH)) {
    console.error(`❌ Icona sorgente non trovata: ${ICON_PATH}`);
    process.exit(1);
  }

  const hasAndroid = fs.existsSync(ANDROID_RES);
  const hasIOS = fs.existsSync(IOS_APP_DIR);

  if (!hasAndroid && !hasIOS) {
    console.error(`❌ Nessuna piattaforma nativa trovata (né ${ANDROID_RES} né ${IOS_APP_DIR}). Esegui prima 'npx cap add android' / 'npx cap add ios'.`);
    process.exit(1);
  }

  const iconBuf = fs.readFileSync(ICON_PATH);
  console.log('── Genero splash screen native (logo Fermenta.to, sfondo bianco) ──');

  if (hasAndroid) {
    await generateAndroid(iconBuf);
  } else {
    console.log('  ⏭️  Android assente — salto (build iOS-only)');
  }

  if (hasIOS) {
    await generateIOS(iconBuf);
  } else {
    console.log('  ⏭️  iOS assente — salto (build Android-only)');
  }

  console.log('── Splash screen generate ──');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
