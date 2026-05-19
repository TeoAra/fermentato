import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = 'http://localhost:5000';
const OUT = 'screenshots/app-store';
fs.mkdirSync(OUT, { recursive: true });

const shots = [
  { name: '01-home',         path: '/' },
  { name: '02-pubs',         path: '/explore/pubs' },
  { name: '03-beers',        path: '/explore/beers' },
  { name: '04-eventi',       path: '/eventi' },
  { name: '05-festival',     path: '/festival' },
  { name: '06-pub-detail',   path: '/pub/7' },
  { name: '07-beer-detail',  path: '/beer/1' },
];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

// Pre-set cookie consent so the banner never appears
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('fermenta_cookie_consent', JSON.stringify({
    necessary: true, analytics: true, marketing: true, preferences: true,
    timestamp: Date.now(), version: 1,
  }));
});

for (const s of shots) {
  try {
    console.log('→', s.path);
    await page.goto(BASE + s.path, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));
    await page.screenshot({ path: `${OUT}/${s.name}.jpg`, type: 'jpeg', quality: 92, fullPage: false });
    console.log('   saved', s.name);
  } catch (e) {
    console.error('  FAIL', s.name, e.message);
  }
}

await browser.close();
console.log('done');
