#!/usr/bin/env python3
"""
Untappd Image Harvester - via Wayback Machine CDX API
Fetches archived Untappd beer pages, extracts og:image URLs,
matches to DB beers by name, and enriches with images.

Usage:
  python3 untappd_image_harvest.py [--country COUNTRY] [--limit N] [--resume]
  
  --country   Filter by country (e.g. "Italia", "United States"). Default: all.
  --limit     Max beers to process per run. Default: 5000.
  --resume    Resume from checkpoint file.
  --dry-run   Just extract URLs, don't upload images.
"""

import os, sys, re, time, json, gzip, argparse, hashlib, logging
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher
from urllib.parse import urljoin, urlparse, quote

import requests
import psycopg2
from psycopg2.extras import RealDictCursor
import cloudinary
import cloudinary.uploader
from bs4 import BeautifulSoup

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/tmp/untappd_harvest.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("harvest")

# ─── Config (from env or defaults) ──────────────────────────────────────────
DB_URL       = os.environ.get("DATABASE_URL", "postgres://fermenta:antanicorp94@127.0.0.1:5432/fermenta")
CDX_ENDPOINT = "http://web.archive.org/cdx/search/cdx"
WB_BASE      = "https://web.archive.org/web"
CHECKPOINT   = Path("/tmp/untappd_harvest_checkpoint.json")
DONE_FILE    = Path("/tmp/untappd_harvest_done.jsonl")  # JSONL log of processed URLs

# Cloudinary (must be set in env)
CLOUD_NAME   = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUD_KEY    = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUD_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; FermentatoBot/1.0; image-enrichment)",
})

# ─── Helpers ────────────────────────────────────────────────────────────────

def slugify_simple(text: str) -> str:
    """Lowercase, strip punctuation, normalize whitespace."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, slugify_simple(a), slugify_simple(b)).ratio()

def fetch_cdx_urls(prefix: str, limit: int = 50000) -> list[dict]:
    """Fetch unique archived Untappd beer URLs from CDX API."""
    params = {
        "url": prefix,
        "output": "json",
        "fl": "original,timestamp",
        "filter": "statuscode:200",
        "collapse": "urlkey",
        "from": "20190101",
        "limit": str(limit),
    }
    log.info(f"Fetching CDX for prefix: {prefix}")
    try:
        r = SESSION.get(CDX_ENDPOINT, params=params, timeout=60)
        data = r.json()
        if not data or len(data) <= 1:
            return []
        headers = data[0]  # ['original', 'timestamp']
        rows = data[1:]
        return [{"url": row[0], "ts": row[1]} for row in rows]
    except Exception as e:
        log.error(f"CDX error for {prefix}: {e}")
        return []

def extract_untappd_id(url: str) -> int | None:
    """Extract numeric Untappd beer ID from URL like /b/brewery-beer/12345"""
    m = re.search(r"/(\d+)/?$", url)
    return int(m.group(1)) if m else None

def extract_beer_name_from_slug(url: str) -> str:
    """Extract approximate beer name from Untappd URL slug."""
    parts = url.rstrip("/").split("/")
    if len(parts) < 2:
        return ""
    slug = parts[-2] if parts[-1].isdigit() else parts[-1]
    # Remove common brewery prefixes (first word is often brewery)
    words = slug.replace("-", " ").split()
    # Try to remove brewery name (first 1-3 words)
    return " ".join(words[1:]) if len(words) > 1 else slug

def fetch_og_image(archived_url: str) -> str | None:
    """Fetch archived HTML page and extract og:image URL."""
    try:
        r = SESSION.get(archived_url, timeout=20, allow_redirects=True)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        tag = soup.find("meta", property="og:image")
        if not tag:
            tag = soup.find("meta", {"name": "og:image"})
        if tag and tag.get("content"):
            return tag["content"]
    except Exception as e:
        log.debug(f"og:image fetch error {archived_url}: {e}")
    return None

def try_download_image(og_image_url: str) -> bytes | None:
    """
    Try multiple strategies to download a beer label image from og:image URL.
    The og:image in archived pages is already a web.archive.org/im_/ URL.
    """
    candidates = [og_image_url]
    
    # Also try without im_ (returns redirect to archived content)
    no_im = og_image_url.replace("/im_/", "/")
    if no_im != og_image_url:
        candidates.append(no_im)
    
    # Try the live CDN URL if extractable (last resort, often 400)
    m = re.search(r"im_/(https?://.+)", og_image_url)
    if m:
        candidates.append(m.group(1))
    
    for url in candidates:
        try:
            r = SESSION.get(url, timeout=15, allow_redirects=True)
            if r.status_code == 200 and len(r.content) > 1000:
                ct = r.headers.get("content-type", "")
                if "image" in ct:
                    return r.content
        except Exception:
            pass
    return None

def upload_to_cloudinary(image_bytes: bytes, beer_id: int) -> str | None:
    """Upload image bytes to Cloudinary and return URL."""
    if not CLOUD_NAME:
        return None
    try:
        cloudinary.config(cloud_name=CLOUD_NAME, api_key=CLOUD_KEY, api_secret=CLOUD_SECRET)
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="fermenta/beers",
            public_id=f"beer_{beer_id}",
            overwrite=False,
            resource_type="image",
            quality="auto:good",
            fetch_format="auto",
        )
        return result.get("secure_url")
    except Exception as e:
        log.error(f"Cloudinary upload error for beer {beer_id}: {e}")
        return None

# ─── DB helpers ─────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

def get_beers_without_images(conn, country: str | None = None, limit: int = 5000):
    """Fetch beers from DB that have no image and optionally filter by country."""
    query = """
        SELECT b.id, b.name, b.brewery_id, br.name AS brewery_name, br.country
        FROM beers b
        JOIN breweries br ON b.brewery_id = br.id
        WHERE (b.logo_url IS NULL OR b.logo_url = '')
          AND (b.image_url IS NULL OR b.image_url = '')
    """
    params = []
    if country:
        query += " AND br.country = %s"
        params.append(country)
    query += f" LIMIT {limit}"
    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()

def update_beer_image(conn, beer_id: int, logo_url: str, barcode: str | None = None):
    with conn.cursor() as cur:
        if barcode:
            cur.execute(
                "UPDATE beers SET logo_url = %s, barcode = %s WHERE id = %s AND (logo_url IS NULL OR logo_url = '')",
                (logo_url, barcode, beer_id),
            )
        else:
            cur.execute(
                "UPDATE beers SET logo_url = %s WHERE id = %s AND (logo_url IS NULL OR logo_url = '')",
                (logo_url, beer_id),
            )
    conn.commit()

# ─── Main harvest logic ──────────────────────────────────────────────────────

def load_checkpoint() -> set:
    """Load set of already-processed Untappd IDs."""
    if CHECKPOINT.exists():
        data = json.loads(CHECKPOINT.read_text())
        return set(data.get("done_ids", []))
    return set()

def save_checkpoint(done_ids: set):
    CHECKPOINT.write_text(json.dumps({"done_ids": list(done_ids), "updated": datetime.now().isoformat()}))

def log_result(entry: dict):
    with DONE_FILE.open("a") as f:
        f.write(json.dumps(entry) + "\n")

# Prefix patterns to cover all countries
# We use a broad * but collapse by urlkey so we get one per unique beer
CDX_PREFIXES = [
    "untappd.com/b/*",  # All beers globally
]

def run(args):
    dry_run = args.dry_run
    max_limit = args.limit
    country_filter = args.country
    resume = args.resume

    done_ids = load_checkpoint() if resume else set()
    log.info(f"Starting harvest. dry_run={dry_run}, country={country_filter}, limit={max_limit}, already_done={len(done_ids)}")

    # 1. Fetch CDX URLs (all Untappd beer pages)
    all_entries = []
    for prefix in CDX_PREFIXES:
        entries = fetch_cdx_urls(prefix, limit=200000)
        log.info(f"CDX returned {len(entries)} URLs for prefix={prefix}")
        all_entries.extend(entries)
    
    if not all_entries:
        log.error("No CDX entries found. Exiting.")
        return

    log.info(f"Total CDX entries: {len(all_entries)}")

    # 2. Connect to DB and get beers without images
    conn = get_db()
    db_beers = get_beers_without_images(conn, country=country_filter, limit=max_limit * 3)
    log.info(f"DB beers without images: {len(db_beers)} (country={country_filter})")

    # Build lookup index: normalized name -> list of beer records
    name_index: dict[str, list] = {}
    for beer in db_beers:
        key = slugify_simple(beer["name"])
        name_index.setdefault(key, []).append(beer)

    stats = {"processed": 0, "matched": 0, "images_saved": 0, "skipped": 0, "errors": 0}
    
    for entry in all_entries:
        if stats["processed"] >= max_limit:
            break

        url = entry["url"]
        ts  = entry["ts"]
        untappd_id = extract_untappd_id(url)
        
        if untappd_id and untappd_id in done_ids:
            stats["skipped"] += 1
            continue

        beer_slug_name = extract_beer_name_from_slug(url)
        if not beer_slug_name:
            continue

        # Find best DB match
        best_beer = None
        best_score = 0.0
        for key, beer_list in name_index.items():
            score = name_similarity(beer_slug_name, key)
            if score > best_score:
                best_score = score
                best_beer = beer_list[0]

        if best_score < 0.6 or not best_beer:
            # Low confidence match, skip
            if untappd_id:
                done_ids.add(untappd_id)
            continue

        stats["processed"] += 1
        stats["matched"] += 1

        log.info(f"[{stats['processed']}/{max_limit}] Matched '{beer_slug_name}' → '{best_beer['name']}' (score={best_score:.2f}) beer_id={best_beer['id']}")

        if dry_run:
            log_result({"beer_id": best_beer["id"], "beer_name": best_beer["name"], "untappd_url": url, "score": best_score, "dry_run": True})
            if untappd_id:
                done_ids.add(untappd_id)
            continue

        # 3. Fetch the archived HTML to get og:image
        archived_page = f"{WB_BASE}/{ts}/{url}"
        time.sleep(0.5)  # Be polite to archive.org
        og_image = fetch_og_image(archived_page)

        if not og_image:
            log.debug(f"No og:image found at {archived_page}")
            if untappd_id:
                done_ids.add(untappd_id)
            continue

        # 4. Try to download the image
        time.sleep(0.3)
        image_bytes = try_download_image(og_image)

        result_entry = {
            "beer_id": best_beer["id"], "beer_name": best_beer["name"],
            "untappd_url": url, "og_image": og_image, "score": best_score,
            "image_downloaded": image_bytes is not None,
        }

        if image_bytes:
            # 5. Upload to Cloudinary
            cloud_url = upload_to_cloudinary(image_bytes, best_beer["id"])
            if cloud_url:
                update_beer_image(conn, best_beer["id"], cloud_url)
                stats["images_saved"] += 1
                result_entry["cloudinary_url"] = cloud_url
                log.info(f"  ✓ Image saved: {cloud_url}")
            else:
                log.warning(f"  ✗ Cloudinary upload failed for beer_id={best_beer['id']}")
                stats["errors"] += 1
        else:
            # Image not accessible but we have og:image URL — save it directly as external link
            # (Still useful as a reference, the user can decide later)
            log.info(f"  ~ Image not downloadable, og:image={og_image[:80]}")
            # Store the raw og:image URL as-is (it's a web.archive.org URL, may work in browser)
            # update_beer_image(conn, best_beer["id"], og_image)  # Uncomment to save archive URLs

        log_result(result_entry)
        if untappd_id:
            done_ids.add(untappd_id)
        
        # Save checkpoint every 100 items
        if stats["processed"] % 100 == 0:
            save_checkpoint(done_ids)
            log.info(f"Stats: {stats}")

    save_checkpoint(done_ids)
    conn.close()

    log.info("=" * 50)
    log.info(f"DONE. Final stats: {stats}")
    log.info(f"Results log: {DONE_FILE}")
    log.info(f"Checkpoint: {CHECKPOINT}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Untappd Image Harvester")
    parser.add_argument("--country", default=None, help="Filter by brewery country")
    parser.add_argument("--limit", type=int, default=5000, help="Max beers to process")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--dry-run", action="store_true", help="No uploads, just log matches")
    args = parser.parse_args()
    run(args)
