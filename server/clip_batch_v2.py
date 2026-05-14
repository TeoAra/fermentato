"""
Batch indexer v2: fetches beers with images from DB, sends to CLIP service.
Usage: python3 clip_batch_v2.py [--batch-size 20] [--limit 5000] [--db-url URL]
"""
import os, sys, json, time, argparse
import urllib.request
import psycopg2, psycopg2.extras

CLIP_PORT = int(os.environ.get("CLIP_PORT", 5002))
DB_URL = os.environ.get("DATABASE_URL", "")

def call_clip(path, payload):
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{CLIP_PORT}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--db-url", type=str, default=DB_URL)
    args = parser.parse_args()

    # Check CLIP service
    try:
        hreq = urllib.request.urlopen(f"http://127.0.0.1:{CLIP_PORT}/health", timeout=5)
        health = json.loads(hreq.read())
        if not health.get("clip_ready"):
            print("CLIP service not ready, waiting..."); time.sleep(15)
    except:
        print("CLIP service not reachable on port", CLIP_PORT); sys.exit(1)

    # Connect to DB
    db_url = args.db_url
    if not db_url:
        # Try reading from .env
        env_file = "/www/nodeapps/fermenta/.env"
        if os.path.exists(env_file):
            for line in open(env_file):
                if line.startswith("DATABASE_URL="):
                    db_url = line.strip().split("=", 1)[1]
                    break
    if not db_url:
        print("No DATABASE_URL found"); sys.exit(1)

    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Check current index
    hreq = urllib.request.urlopen(f"http://127.0.0.1:{CLIP_PORT}/stats", timeout=5)
    stats = json.loads(hreq.read())
    print(f"Current index size: {stats['indexed']} beers")

    # Get indexed IDs to skip
    indexed_stats = stats["indexed"]

    # Fetch beers with images
    query = """
        SELECT id, COALESCE(logo_url, image_url) as img_url
        FROM beers
        WHERE (logo_url IS NOT NULL OR image_url IS NOT NULL)
          AND (logo_url != '' OR image_url != '')
        ORDER BY id
    """
    if args.limit > 0:
        query += f" LIMIT {args.limit}"

    cur.execute(query)
    rows = cur.fetchall()
    print(f"Found {len(rows)} beers with images to index")
    conn.close()

    total_ok = total_fail = 0
    batch = []

    for i, row in enumerate(rows):
        batch.append({"id": row["id"], "url": row["img_url"]})

        if len(batch) >= args.batch_size:
            try:
                result = call_clip("/index-batch", {"items": batch})
                total_ok += result.get("ok", 0)
                total_fail += result.get("fail", 0)
                print(f"  [{i+1}/{len(rows)}] ok={total_ok} fail={total_fail} total_indexed={result.get('total',0)}", flush=True)
            except Exception as e:
                print(f"  Batch error: {e}", flush=True)
                total_fail += len(batch)
            batch = []

    # Process remaining
    if batch:
        try:
            result = call_clip("/index-batch", {"items": batch})
            total_ok += result.get("ok", 0)
            total_fail += result.get("fail", 0)
        except Exception as e:
            print(f"  Final batch error: {e}", flush=True)

    print(f"\nDone! {total_ok} indexed, {total_fail} failed")

if __name__ == "__main__":
    main()
