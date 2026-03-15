import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '../client/public/icons');
const ICON_PATH = path.join(ICONS_DIR, 'icon-512.png');

// Background color matching manifest.json + index.html theme
const BG_COLOR = { r: 255, g: 247, b: 237, alpha: 1 }; // #FFF7ED

// All iOS splash screen sizes (width x height)
const SIZES = [
  { file: 'splash-640x1136.png',   w: 640,  h: 1136 }, // iPhone SE/5
  { file: 'splash-750x1334.png',   w: 750,  h: 1334 }, // iPhone 8/SE2
  { file: 'splash-1242x2208.png',  w: 1242, h: 2208 }, // iPhone 8 Plus
  { file: 'splash-1125x2436.png',  w: 1125, h: 2436 }, // iPhone X/XS/11 Pro
  { file: 'splash-1242x2688.png',  w: 1242, h: 2688 }, // iPhone XS Max/11 Pro Max
  { file: 'splash-1170x2532.png',  w: 1170, h: 2532 }, // iPhone 12/13/14
  { file: 'splash-1284x2778.png',  w: 1284, h: 2778 }, // iPhone 14 Plus/15 Plus
  { file: 'splash-1179x2556.png',  w: 1179, h: 2556 }, // iPhone 14 Pro
  { file: 'splash-1290x2796.png',  w: 1290, h: 2796 }, // iPhone 14 Pro Max/15 Pro Max
];

// Logo size: ~1/4 of screen width, max 300px
function logoSize(w) {
  return Math.min(Math.round(w * 0.28), 300);
}

async function generate() {
  // Pre-load and resize the icon as a buffer for compositing
  for (const { file, w, h } of SIZES) {
    const size = logoSize(w);
    const iconBuf = await sharp(ICON_PATH)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: BG_COLOR,
      },
    })
      .composite([
        {
          input: iconBuf,
          gravity: 'center',
        },
      ])
      .png({ compressionLevel: 8 })
      .toFile(path.join(ICONS_DIR, file));

    console.log(`✓ ${file}  (${w}×${h}, icon ${size}px)`);
  }

  console.log('\nAll splash screens generated.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
