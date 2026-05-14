"""
Batch indexer v3: uses keyword args for psycopg2 connection.
Usage: python3 clip_batch_v3.py [--batch-size 20] [--limit 5000]
"""
import os, sys, json, time, argparse, urllib.request
import psycopg2, psycopg2.extras

CLIP_PORT = int(os.environ.get("CLIP_PORT", 5002))

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
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    # Check CLIP service
    try:
        hreq = urllib.request.urlopen(f"http://127.0.0.1:{CLIP_PORT}/health", timeout=5)
        health = json.loads(hreq.read())
        print(f"CLIP health: {health}", flush=True)
        if not health.get("clip_ready"):
            print("CLIP not ready, waiting 15s..."); time.sleep(15)
    except Exception as e:
        print(f"CLIP unreachable: {e}"); sys.exit(1)

    conn = psycopg2.connect(
        host="127.0.0.1", port=5432, dbname="fermenta",
        user="fermenta", password="antanicorp94", connect_timeout=10
    )
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    hreq = urllib.request.urlopen(f"http://127.0.0.1:{CLIP_PORT}/stats", timeout=5)
    stats = json.loads(hreq.read())
    print(f"Current index size: {stats['indexed']}", flush=True)

    query = """
        SELECT id, COALESCE(NULLIF(logo_url,''), NULLIF(image_url,'')) as img_url
        FROM beers
        WHERE (logo_url IS NOT NULL AND logo_url != '')
           OR (image_url IS NOT NULL AND image_url != '')
        ORDER BY id
    """
    if args.limit > 0:
        query += f" LIMIT {args.limit}"

    cur.execute(query)
    rows = cur.fetchall()
    conn.close()
    print(f"Found {len(rows)} beers with images", flush=True)

    total_ok = total_fail = 0
    batch = []

    for i, row in enumerate(rows):
        if row["img_url"]:
            batch.append({"id": row["id"], "url": row["img_url"]})

        if len(batch) >= args.batch_size:
            try:
                result = call_clip("/index-batch", {"items": batch})
                total_ok += result.get("ok", 0)
                total_fail += result.get("fail", 0)
                print(f"[{i+1}/{len(rows)}] ok={total_ok} fail={total_fail} indexed={result.get('total',0)}", flush=True)
            except Exception as e:
                print(f"Batch error at {i+1}: {e}", flush=True)
                total_fail += len(batch)
            batch = []

    if batch:
        try:
            result = call_clip("/index-batch", {"items": batch})
            total_ok += result.get("ok", 0)
            total_fail += result.get("fail", 0)
        except Exception as e:
            print(f"Final batch error: {e}", flush=True)

    hreq = urllib.request.urlopen(f"http://127.0.0.1:{CLIP_PORT}/stats", timeout=5)
    final_stats = json.loads(hreq.read())
    print(f"\nDone! ok={total_ok} fail={total_fail} | total indexed={final_stats['indexed']}", flush=True)

if __name__ == "__main__":
    main()
