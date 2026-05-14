"""
Batch script: generate CLIP embeddings for beers with images, store in Neon DB.
Run: python3 /www/nodeapps/fermenta/server/clip_batch.py [--limit N] [--offset N]
"""
import sys
import os
import json
import base64
import io
import time
import urllib.request
import urllib.error

try:
    import torch
    import clip
    from PIL import Image
    import numpy as np
    import psycopg2
    import psycopg2.extras
except ImportError as e:
    print(f"Missing dependency: {e}")
    sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
BATCH_SIZE = 50
CLIP_PORT = int(os.environ.get("CLIP_PORT", 5002))

def get_embedding_via_service(url):
    payload = json.dumps({"url": url}).encode()
    req = urllib.request.Request(
        f"http://127.0.0.1:{CLIP_PORT}/embed",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
        return data["embedding"]

def get_embedding_local(url, model, preprocess, device):
    img_req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(img_req, timeout=10) as resp:
        img_bytes = resp.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img_tensor = preprocess(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model.encode_image(img_tensor)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().flatten().tolist()

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10000)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--use-service", action="store_true", help="Use running CLIP service instead of loading model here")
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Count pending
    cur.execute("""
        SELECT COUNT(*) FROM beers
        WHERE (logo_url IS NOT NULL OR image_url IS NOT NULL)
        AND embedding IS NULL
    """)
    total_pending = cur.fetchone()[0]
    print(f"Total beers needing embeddings: {total_pending}")

    model_obj = None
    preprocess_obj = None
    device = "cpu"

    if not args.use_service:
        print("Loading CLIP model...")
        model_obj, preprocess_obj = clip.load("ViT-B/32", device=device)
        model_obj.eval()
        print("CLIP loaded.")

    cur.execute("""
        SELECT id, COALESCE(logo_url, image_url) as img_url
        FROM beers
        WHERE (logo_url IS NOT NULL OR image_url IS NOT NULL)
        AND embedding IS NULL
        LIMIT %s OFFSET %s
    """, (args.limit, args.offset))

    rows = cur.fetchall()
    print(f"Processing {len(rows)} beers (offset={args.offset})")

    ok = 0
    fail = 0
    update_cur = conn.cursor()

    for i, row in enumerate(rows):
        beer_id = row["id"]
        img_url = row["img_url"]
        try:
            if args.use_service:
                vec = get_embedding_via_service(img_url)
            else:
                vec = get_embedding_local(img_url, model_obj, preprocess_obj, device)

            vec_str = "[" + ",".join(f"{v:.6f}" for v in vec) + "]"
            update_cur.execute("UPDATE beers SET embedding = %s::vector WHERE id = %s", (vec_str, beer_id))
            ok += 1

            if ok % BATCH_SIZE == 0:
                conn.commit()
                print(f"  [{i+1}/{len(rows)}] {ok} ok, {fail} fail", flush=True)

        except Exception as e:
            fail += 1
            if fail % 50 == 0:
                print(f"  [{i+1}/{len(rows)}] fail: {beer_id} — {e}", flush=True)

    conn.commit()
    print(f"Done. {ok} embeddings stored, {fail} failed.")
    conn.close()

if __name__ == "__main__":
    main()
