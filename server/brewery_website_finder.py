#!/usr/bin/env python3
"""
Brewery Website Finder - Step 1: populate website_url in DB
Sources: OpenBreweryDB (US), URL pattern guessing (Italy/EU)

Usage:
  python3 brewery_website_finder.py [--country COUNTRY] [--limit N] [--no-validate]
"""

import os, sys, re, time, json, logging, argparse, pathlib
from difflib import SequenceMatcher

# Load .env.enrichment if DATABASE_URL not in env
_ef = pathlib.Path("/www/nodeapps/fermenta/.env.enrichment")
if _ef.exists():
    for _l in _ef.read_text().splitlines():
        if "=" in _l and not _l.startswith("#"):
            _k, _v = _l.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

import requests
import psycopg2
from psycopg2.extras import RealDictCursor

DB_URL       = os.environ.get("DATABASE_URL", "postgres://fermenta:antanicorp94@127.0.0.1:5432/fermenta")
OPENBREWERYDB = "https://api.openbrewerydb.org/v1/breweries"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                    handlers=[logging.FileHandler("/tmp/brewery_website_finder.log"), logging.StreamHandler()])
log = logging.getLogger("website_finder")

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "FermentatoBot/1.0 (brewery data enrichment)"})

def slugify(text):
    t = text.lower()
    t = re.sub(r"[àáâãä]", "a", t); t = re.sub(r"[èéêë]", "e", t)
    t = re.sub(r"[ìíîï]", "i", t); t = re.sub(r"[òóôõö]", "o", t)
    t = re.sub(r"[ùúûü]", "u", t)
    return re.sub(r"[^a-z0-9]", "", t)

def similarity(a, b):
    return SequenceMatcher(None, slugify(a), slugify(b)).ratio()

def get_db():
    return psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)

def validate_url(url, timeout=6):
    if not url or not url.startswith("http"):
        return False
    try:
        r = SESSION.head(url, timeout=timeout, allow_redirects=True)
        if r.status_code < 400:
            return True
        r = SESSION.get(url, timeout=timeout, allow_redirects=True)
        return r.status_code < 400 and len(r.content) > 300
    except Exception:
        return False

def fetch_openbrewerydb(country="united_states"):
    all_breweries = []
    page = 1
    while True:
        try:
            r = SESSION.get(OPENBREWERYDB, params={"by_country": country, "per_page": 200, "page": page}, timeout=30)
            data = r.json()
            if not data:
                break
            all_breweries.extend(data)
            log.info(f"OpenBreweryDB [{country}] page {page}: {len(data)} (total: {len(all_breweries)})")
            if len(data) < 200:
                break
            page += 1
            time.sleep(0.3)
        except Exception as e:
            log.error(f"OpenBreweryDB error: {e}")
            break
    return all_breweries

def guess_italian_urls(name):
    slug = slugify(name)
    for prefix in ["birrificio", "birreria", "brewpub", "microbirrificio", "agricolo", "artigianale"]:
        if slug.startswith(prefix) and len(slug) > len(prefix) + 2:
            slug = slug[len(prefix):]
            break
    return [
        f"https://www.{slugify(name)}.it",
        f"https://www.birrificio{slug}.it",
        f"https://www.birreria{slug}.it",
        f"https://{slugify(name)}.it",
    ]

def guess_urls_by_country(name, country):
    slug = slugify(name)
    tld_map = {
        "Germany": ".de", "Germania": ".de",
        "France": ".fr", "Francia": ".fr",
        "Belgium": ".be", "Belgio": ".be",
        "Spain": ".es", "Spagna": ".es",
        "Netherlands": ".nl", "Paesi Bassi": ".nl",
        "Austria": ".at", "Switzerland": ".ch",
        "Denmark": ".dk", "Danimarca": ".dk",
        "Sweden": ".se", "Svezia": ".se",
        "Norway": ".no", "Norvegia": ".no",
        "Finland": ".fi", "Finlandia": ".fi",
        "Ireland": ".ie", "Irlanda": ".ie",
        "England": ".co.uk", "United Kingdom": ".co.uk",
        "Japan": ".co.jp", "Giappone": ".co.jp",
        "Canada": ".ca", "Australia": ".com.au",
    }
    tld = tld_map.get(country, ".com")
    return [f"https://www.{slug}{tld}", f"https://{slug}{tld}", f"https://www.{slug}.com"]

def process_us_breweries(conn, validate=True, limit=None):
    log.info("Fetching OpenBreweryDB US breweries...")
    ob = fetch_openbrewerydb("united_states")
    ob_with_url = [b for b in ob if b.get("website_url")]
    log.info(f"Got {len(ob)} US breweries, {len(ob_with_url)} with URL")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, name, location, country FROM breweries
            WHERE country IN ('United States','USA')
              AND (website_url IS NULL OR website_url = '')
            LIMIT %s
        """, (limit or 99999,))
        our = cur.fetchall()
    log.info(f"Our DB: {len(our)} US breweries without website_url")

    ob_index = {}
    for b in ob_with_url:
        ob_index.setdefault(slugify(b["name"]), []).append(b)

    matched = 0
    for brewery in our:
        best = None; best_score = 0.0
        our_slug = slugify(brewery["name"])
        for key, candidates in ob_index.items():
            score = similarity(our_slug, key)
            if score > best_score:
                best_score = score; best = candidates[0]

        if best_score >= 0.85 and best and best.get("website_url"):
            url = best["website_url"]
            if validate and not validate_url(url):
                continue
            with conn.cursor() as cur:
                cur.execute("UPDATE breweries SET website_url = %s WHERE id = %s AND (website_url IS NULL OR website_url = '')", (url, brewery["id"]))
            conn.commit()
            matched += 1
            log.info(f"  ✓ {brewery['name']} → {url} ({best_score:.2f})")

    log.info(f"US matched: {matched}")
    return matched

def process_breweries_by_country(conn, country, url_guesser, validate=True, limit=200):
    with conn.cursor() as cur:
        cur.execute("SELECT id, name, location, country FROM breweries WHERE country = %s AND (website_url IS NULL OR website_url = '') LIMIT %s",
                   (country, limit))
        our = cur.fetchall()
    if not our:
        log.info(f"[{country}] No breweries to process")
        return 0

    log.info(f"[{country}] Processing {len(our)} breweries")
    found = 0
    for brewery in our:
        candidates = url_guesser(brewery["name"])
        found_url = None
        for url in candidates:
            if not validate or validate_url(url):
                found_url = url
                break
            time.sleep(0.15)

        if found_url:
            with conn.cursor() as cur:
                cur.execute("UPDATE breweries SET website_url = %s WHERE id = %s AND (website_url IS NULL OR website_url = '')", (found_url, brewery["id"]))
            conn.commit()
            found += 1
            log.info(f"  ✓ [{country}] {brewery['name']} → {found_url}")
        else:
            log.debug(f"  ✗ [{country}] {brewery['name']}: no URL found")

    log.info(f"[{country}] Found: {found}/{len(our)}")
    return found

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Brewery Website Finder")
    parser.add_argument("--country", default="all")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--no-validate", action="store_true")
    args = parser.parse_args()

    validate = not args.no_validate
    conn = get_db()
    total = 0

    OTHER_COUNTRIES = ["Germany","France","Belgium","England","Spain","Netherlands",
                       "Denmark","Sweden","Canada","Australia","Austria","Ireland","Japan"]

    if args.country in ("all", "United States"):
        total += process_us_breweries(conn, validate=validate, limit=args.limit)

    if args.country in ("all", "Italia", "Italy"):
        total += process_breweries_by_country(conn, "Italia", guess_italian_urls, validate=validate, limit=args.limit)

    if args.country == "all":
        for c in OTHER_COUNTRIES:
            total += process_breweries_by_country(conn, c, lambda n, c=c: guess_urls_by_country(n, c), validate=validate, limit=max(50, args.limit // 10))
    elif args.country not in ("United States", "Italia", "Italy"):
        total += process_breweries_by_country(conn, args.country, lambda n: guess_urls_by_country(n, args.country), validate=validate, limit=args.limit)

    conn.close()
    log.info(f"\nDONE. Total website URLs found: {total}")
