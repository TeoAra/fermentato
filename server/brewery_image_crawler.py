#!/usr/bin/env python3
"""
Brewery Image Crawler - Step 2: crawl brewery websites for beer images
Requires website_url to be set in DB (run brewery_website_finder.py first).

Usage:
  python3 brewery_image_crawler.py [--country COUNTRY] [--limit N] [--resume]
"""

import os, sys, re, time, json, logging, argparse, pathlib
from difflib import SequenceMatcher
from urllib.parse import urljoin, urlparse

# Load .env.enrichment if not set
_ef = pathlib.Path("/www/nodeapps/fermenta/.env.enrichment")
if _ef.exists():
    for _l in _ef.read_text().splitlines():
        if "=" in _l and not _l.startswith("#"):
            _k, _v = _l.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import cloudinary, cloudinary.uploader
from bs4 import BeautifulSoup

DB_URL       = os.environ.get("DATABASE_URL", "postgres://fermenta:antanicorp94@127.0.0.1:5432/fermenta")
CLOUD_NAME   = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUD_KEY    = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUD_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CHECKPOINT   = pathlib.Path("/tmp/brewery_crawler_checkpoint.json")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                    handlers=[logging.FileHandler("/tmp/brewery_crawler.log"), logging.StreamHandler()])
log = logging.getLogger("crawler")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.7",
})

def get_db():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

def slugify(text):
    t = text.lower()
    t = re.sub(r"[àáâãä]", "a", t); t = re.sub(r"[èéêë]", "e", t)
    t = re.sub(r"[ìíîï]", "i", t); t = re.sub(r"[òóôõö]", "o", t)
    t = re.sub(r"[ùúûü]", "u", t)
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def similarity(a, b):
    return SequenceMatcher(None, slugify(a), slugify(b)).ratio()

def is_beer_image(url, alt=""):
    url_l = url.lower(); alt_l = (alt or "").lower()
    bad = ["logo", "header", "banner", "icon", "avatar", "background", "map", "footer", "sprite"]
    good = ["birra", "beer", "lager", "ale", "ipa", "stout", "weizen", "product", "label", "etichett", "bottl"]
    if any(k in url_l for k in bad):
        return False
    if any(k in url_l or k in alt_l for k in good):
        return True
    return True

def find_product_pages(base_url, html):
    soup = BeautifulSoup(html, "html.parser")
    links = set()
    keywords = ["birr", "beer", "bier", "prodott", "product", "catalog", "shop", "menu"]
    base_netloc = urlparse(base_url).netloc
    for a in soup.find_all("a", href=True):
        combined = (a["href"] + " " + a.get_text(strip=True)).lower()
        if any(k in combined for k in keywords):
            full = urljoin(base_url, a["href"])
            if urlparse(full).netloc == base_netloc:
                links.add(full)
    return list(links)[:12]

def extract_beer_images(base_url, html, db_beers):
    soup = BeautifulSoup(html, "html.parser")
    results = []
    
    # Strategy 1: structured product containers
    for container in soup.find_all(["article", "div", "li", "section"],
                                    class_=re.compile(r"(product|beer|birra|item|card|brew)", re.I)):
        img = container.find("img")
        name_el = container.find(re.compile(r"h[1-6]|strong|span"), string=re.compile(r"\w{3,}"))
        if not img or not name_el:
            continue
        img_url = img.get("src") or img.get("data-src") or img.get("data-lazy-src", "")
        beer_name = name_el.get_text(strip=True)
        alt = img.get("alt", "")
        if not img_url or not beer_name or not is_beer_image(img_url, alt):
            continue
        full_img = urljoin(base_url, img_url)
        matched = best_match(beer_name, db_beers)
        if matched and matched["score"] >= 0.7:
            results.append({**matched, "image_url": full_img})
    
    # Strategy 2: img with good alt text
    if not results:
        for img in soup.find_all("img"):
            img_url = img.get("src") or img.get("data-src", "")
            alt = img.get("alt", "")
            if not img_url or not alt or not is_beer_image(img_url, alt):
                continue
            full_img = urljoin(base_url, img_url)
            matched = best_match(alt, db_beers)
            if matched and matched["score"] >= 0.75:
                results.append({**matched, "image_url": full_img})
    
    return results

def best_match(name, db_beers):
    best = None; best_score = 0.0
    for beer in db_beers:
        score = similarity(name, beer["name"])
        if score > best_score:
            best_score = score; best = beer
    return {"beer": best, "score": best_score} if best else None

def download_image(url):
    try:
        r = SESSION.get(url, timeout=12, allow_redirects=True)
        if r.status_code == 200 and len(r.content) > 2000:
            if "image" in r.headers.get("content-type", "") or url.lower().endswith((".jpg",".jpeg",".png",".webp")):
                return r.content
    except Exception as e:
        log.debug(f"Download failed {url}: {e}")
    return None

def upload_to_cloudinary(image_bytes, beer_id):
    if not CLOUD_NAME: return None
    try:
        cloudinary.config(cloud_name=CLOUD_NAME, api_key=CLOUD_KEY, api_secret=CLOUD_SECRET)
        result = cloudinary.uploader.upload(
            image_bytes, folder="fermenta/beers", public_id=f"beer_{beer_id}",
            overwrite=False, resource_type="image", quality="auto:good", fetch_format="auto",
        )
        return result.get("secure_url")
    except Exception as e:
        log.error(f"Cloudinary error beer {beer_id}: {e}")
        return None

def update_beer_image(conn, beer_id, logo_url):
    with conn.cursor() as cur:
        cur.execute("UPDATE beers SET logo_url = %s WHERE id = %s AND (logo_url IS NULL OR logo_url = '')", (logo_url, beer_id))
    conn.commit()

def load_done():
    if CHECKPOINT.exists():
        return set(json.loads(CHECKPOINT.read_text()).get("done", []))
    return set()

def save_done(done):
    CHECKPOINT.write_text(json.dumps({"done": list(done)}))

def run(args):
    conn = get_db()
    done = load_done() if args.resume else set()

    query = "SELECT id, name, country, website_url FROM breweries WHERE website_url IS NOT NULL AND website_url != ''"
    params = []
    if args.country and args.country != "all":
        query += " AND country = %s"; params.append(args.country)
    query += f" LIMIT {args.limit}"

    with conn.cursor() as cur:
        cur.execute(query, params)
        breweries = cur.fetchall()
    log.info(f"Processing {len(breweries)} breweries (country={args.country})")

    stats = {"breweries": 0, "pages": 0, "images": 0, "errors": 0}

    for brewery in breweries:
        if brewery["id"] in done:
            continue
        stats["breweries"] += 1
        log.info(f"\n[{stats['breweries']}/{len(breweries)}] {brewery['name']} ({brewery['country']}) → {brewery['website_url']}")

        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM beers WHERE brewery_id = %s AND (logo_url IS NULL OR logo_url = '')", (brewery["id"],))
            db_beers = cur.fetchall()
        if not db_beers:
            done.add(brewery["id"]); continue
        log.info(f"  {len(db_beers)} beers need images")

        try:
            r = SESSION.get(brewery["website_url"], timeout=12, allow_redirects=True)
            if r.status_code != 200:
                stats["errors"] += 1; done.add(brewery["id"]); continue
        except Exception as e:
            log.warning(f"  Homepage error: {e}"); stats["errors"] += 1; done.add(brewery["id"]); continue

        stats["pages"] += 1
        home_html = r.text
        pages = [brewery["website_url"]] + find_product_pages(brewery["website_url"], home_html)

        found_images = {}
        for page_url in pages[:8]:
            if page_url != brewery["website_url"]:
                time.sleep(0.4)
                try:
                    pr = SESSION.get(page_url, timeout=10, allow_redirects=True)
                    if pr.status_code != 200: continue
                    page_html = pr.text; stats["pages"] += 1
                except Exception: continue
            else:
                page_html = home_html

            for m in extract_beer_images(brewery["website_url"], page_html, db_beers):
                beer_id = m["beer"]["id"]
                if beer_id not in found_images or m["score"] > found_images[beer_id]["score"]:
                    found_images[beer_id] = m

        log.info(f"  Matched {len(found_images)} beers with images")

        for beer_id, m in found_images.items():
            img_bytes = download_image(m["image_url"])
            if not img_bytes: continue
            cloud_url = upload_to_cloudinary(img_bytes, beer_id)
            if cloud_url:
                update_beer_image(conn, beer_id, cloud_url)
                stats["images"] += 1
                log.info(f"    ✓ {m['beer']['name']} → {cloud_url}")
            else:
                stats["errors"] += 1

        done.add(brewery["id"])
        if stats["breweries"] % 20 == 0:
            save_done(done); log.info(f"Stats: {stats}")
        time.sleep(1.0)

    save_done(done); conn.close()
    log.info(f"\nDONE. Stats: {stats}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", default="all")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    run(args)
