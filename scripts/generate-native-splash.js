#!/usr/bin/env node
/**
 * Genera splash screen native per Android e iOS partendo da resources/icon.png.
 * Usato dal build-apk.sh dopo `npx cap sync` per sovrascrivere il logo
 * di default Capacitor (X blu) con il logo proprietario Fermenta.to.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICON_PATH = path.resolve('resources/icon.png');
const ANDROID_RES = path.resolve('android/app/src/main/res');
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
  fs.mkdirSync(IOS_ASSETS, { recursive: true });

  // iOS usa un'unica immagine 2732x2732 (universal) scalata automaticamente
  const size = 2732;
  const iconTarget = Math.round(size * 0.25);
  const resized = await sharp(iconBuf)
    .resize(iconTarget, iconTarget, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 6 })
    .toFile(path.join(IOS_ASSETS, 'splash.png'));
  console.log(`  ✅ ios/Splash.imageset/splash.png (${size}x${size})`);

  // Contents.json per Xcode
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
  if (!fs.existsSync(ANDROID_RES)) {
    console.error(`❌ Directory Android non trovata: ${ANDROID_RES} — esegui prima 'npx cap add android'`);
    process.exit(1);
  }

  const iconBuf = fs.readFileSync(ICON_PATH);
  console.log('── Genero splash screen native (logo Fermenta.to, sfondo bianco) ──');
  await generateAndroid(iconBuf);
  await generateIOS(iconBuf);
  console.log('── Splash screen generate ──');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
