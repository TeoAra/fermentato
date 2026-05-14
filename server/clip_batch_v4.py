"""
Batch indexer v4 — usa CLIP service v3 ottimizzato.
Invia batch grandi per sfruttare il download parallelo + CLIP batch inference.
"""
import os, sys, json, time, argparse, urllib.request
import psycopg2, psycopg2.extras

CLIP_PORT = int(os.environ.get("CLIP_PORT", 5002))

def call_clip(path, payload, timeout=300):
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{CLIP_PORT}{path}",
        data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=32,
                        help="Immagini per batch (default 32 — sfrutta parallelismo)")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--offset", type=int, default=0,
                        help="Salta le prime N birre (per riprendere)")
    args = parser.parse_args()

    # Verifica CLIP service
    try:
        hreq = urllib.request.urlopen(f"http://127.0.0.1:{CLIP_PORT}/health", timeout=5)
        health = json.loads(hreq.read())
        print(f"CLIP: {health}", flush=True)
    except Exception as e:
        print(f"CLIP non raggiungibile: {e}"); sys.exit(1)

    # Connessione DB
    conn = psycopg2.connect(
        host="127.0.0.1", port=5432, dbname="fermenta",
        user="fermenta", password="antanicorp94", connect_timeout=10
    )
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    query = """
        SELECT id, COALESCE(NULLIF(logo_url,''), NULLIF(image_url,'')) as img_url
        FROM beers
        WHERE (logo_url IS NOT NULL AND logo_url != '')
           OR (image_url IS NOT NULL AND image_url != '')
        ORDER BY id
        OFFSET %s
    """
    params = [args.offset]
    if args.limit > 0:
        query += " LIMIT %s"
        params.append(args.limit)

    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    print(f"Trovate {len(rows)} birre con immagini (offset={args.offset})", flush=True)

    total_ok = total_fail = 0
    t_start = time.time()
    batch = []

    for i, row in enumerate(rows):
        if row["img_url"]:
            batch.append({"id": row["id"], "url": row["img_url"]})

        if len(batch) >= args.batch_size:
            try:
                result = call_clip("/index-batch", {"items": batch})
                total_ok += result.get("ok", 0)
                total_fail += result.get("fail", 0)
                elapsed = time.time() - t_start
                rate = total_ok / elapsed if elapsed > 0 else 0
                eta_min = ((len(rows) - i) / max(rate, 0.01)) / 60
                print(
                    f"[{i+1}/{len(rows)}] ok={total_ok} fail={total_fail} "
                    f"indexed={result.get('total',0)} "
                    f"{rate:.1f}img/s ETA={eta_min:.0f}min "
                    f"({result.get('imgs_per_sec','?')}img/s this batch)",
                    flush=True
                )
            except Exception as e:
                print(f"Errore batch {i+1}: {e}", flush=True)
                total_fail += len(batch)
            batch = []

    if batch:
        try:
            result = call_clip("/index-batch", {"items": batch})
            total_ok += result.get("ok", 0)
            total_fail += result.get("fail", 0)
        except Exception as e:
            print(f"Errore batch finale: {e}", flush=True)

    elapsed = time.time() - t_start
    print(f"\nCompletato! ok={total_ok} fail={total_fail} in {elapsed/60:.1f} minuti", flush=True)
    print(f"Velocità media: {total_ok/elapsed:.1f} immagini/secondo", flush=True)

if __name__ == "__main__":
    main()
