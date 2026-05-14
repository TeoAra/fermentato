"""
CLIP Embedding Service v3 — Fermenta.to
Ottimizzazioni:
  - Batch inference PyTorch: processa N immagini in una sola chiamata encode_image
  - Download paralleli con ThreadPoolExecutor
  - Ricerca in-memory numpy (nessun pgvector richiesto)
Endpoints:
  POST /embed            -> vettore singola immagine
  POST /search           -> cerca birre simili nell'indice
  POST /index            -> indicizza/aggiorna una birra
  POST /index-batch      -> batch indicizzazione (download parallelo + CLIP batch)
  POST /index-beer-id    -> indicizza una birra dato id (query DB locale)
  GET  /health           -> stato servizio
  GET  /stats            -> statistiche indice
"""
import sys, os, json, base64, io, time, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

INDEX_FILE = Path(os.environ.get("CLIP_INDEX_FILE", "/www/nodeapps/fermenta/data/clip_index.npz"))
CLIP_PORT  = int(os.environ.get("CLIP_PORT", 5002))
BATCH_SIZE = int(os.environ.get("CLIP_BATCH_SIZE", 16))  # ottimale per CPU
DL_WORKERS = int(os.environ.get("CLIP_DL_WORKERS", 8))   # download paralleli

try:
    import torch, clip
    from PIL import Image
    import numpy as np
    CLIP_READY = True
except ImportError as e:
    print(f"[clip] Import error: {e}", flush=True)
    CLIP_READY = False

model = preprocess = None
_lock = threading.Lock()
index_vecs: "np.ndarray | None" = None
index_ids: list = []

def load_clip():
    global model, preprocess
    if model: return True
    print("[clip] Carico CLIP ViT-B/32...", flush=True)
    try:
        model, preprocess = clip.load("ViT-B/32", device="cpu")
        model.eval()
        print("[clip] CLIP pronto!", flush=True)
        return True
    except Exception as e:
        print(f"[clip] Errore caricamento: {e}", flush=True)
        return False

def load_index():
    global index_vecs, index_ids
    if not INDEX_FILE.exists(): return
    try:
        data = np.load(str(INDEX_FILE), allow_pickle=True)
        index_vecs = data["vecs"].astype(np.float32)
        index_ids  = data["ids"].tolist()
        print(f"[clip] Indice caricato: {len(index_ids)} birre", flush=True)
    except Exception as e:
        print(f"[clip] Errore caricamento indice: {e}", flush=True)

def save_index():
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    if index_vecs is None or len(index_ids) == 0: return
    np.savez(str(INDEX_FILE), vecs=index_vecs, ids=np.array(index_ids))

# ---- Embedding ----

def _download_image(url: str) -> "Image.Image | None":
    """Scarica e converte in PIL Image."""
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=10) as resp:
            return Image.open(io.BytesIO(resp.read())).convert("RGB")
    except Exception:
        return None

def embed_pil_batch(pil_images: list) -> "np.ndarray":
    """Embedding batch: una sola chiamata CLIP per N immagini — molto più veloce."""
    tensors = torch.stack([preprocess(img) for img in pil_images])
    with torch.no_grad():
        features = model.encode_image(tensors)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().astype(np.float32)

def embed_bytes(b: bytes) -> "np.ndarray":
    img = Image.open(io.BytesIO(b)).convert("RGB")
    return embed_pil_batch([img])[0]

def embed_url(url: str) -> "np.ndarray | None":
    img = _download_image(url)
    if img is None: return None
    return embed_pil_batch([img])[0]

def process_url_batch(items: list) -> list:
    """
    Scarica le immagini in parallelo, poi fa batch CLIP inference.
    items: [{"id": int, "url": str}, ...]
    returns: [{"id": int, "vec": np.array} | {"id": int, "error": str}]
    """
    # Download parallelo
    results_map = {}
    with ThreadPoolExecutor(max_workers=DL_WORKERS) as ex:
        future_map = {ex.submit(_download_image, it["url"]): it for it in items}
        for fut in as_completed(future_map):
            item = future_map[fut]
            img = fut.result()
            if img is not None:
                results_map[item["id"]] = img
            else:
                results_map[item["id"]] = None

    # Raggruppa le immagini scaricate con successo per batch CLIP
    ok_ids = [it["id"] for it in items if results_map.get(it["id"]) is not None]
    ok_imgs = [results_map[id_] for id_ in ok_ids]

    if not ok_imgs:
        return [{"id": it["id"], "error": "download failed"} for it in items]

    # Batch CLIP in sotto-gruppi da BATCH_SIZE
    vecs = []
    for i in range(0, len(ok_imgs), BATCH_SIZE):
        chunk = ok_imgs[i:i+BATCH_SIZE]
        vecs.extend(embed_pil_batch(chunk))

    results = []
    vec_iter = iter(vecs)
    for id_ in ok_ids:
        results.append({"id": id_, "vec": next(vec_iter)})
    for it in items:
        if it["id"] not in ok_ids:
            results.append({"id": it["id"], "error": "download failed"})
    return results

# ---- Indice ----

def add_to_index(beer_id: int, vec: "np.ndarray"):
    global index_vecs, index_ids
    with _lock:
        if beer_id in index_ids:
            pos = index_ids.index(beer_id)
            index_vecs[pos] = vec
        else:
            index_ids.append(beer_id)
            index_vecs = vec.reshape(1, -1) if index_vecs is None else np.vstack([index_vecs, vec.reshape(1, -1)])

def cosine_search(q_vec: "np.ndarray", k: int = 5) -> list:
    if index_vecs is None or len(index_ids) == 0: return []
    sims = index_vecs @ q_vec
    top_k = min(k, len(index_ids))
    idx = np.argpartition(sims, -top_k)[-top_k:]
    idx = idx[np.argsort(sims[idx])[::-1]]
    return [{"id": int(index_ids[i]), "similarity": float(sims[i])} for i in idx]

# ---- HTTP Handler ----

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_json(self, code, data):
        b = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(b))
        self.end_headers(); self.wfile.write(b)

    def read_json(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n))

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"ok": True, "clip_ready": CLIP_READY and model is not None,
                                 "index_size": len(index_ids), "batch_size": BATCH_SIZE,
                                 "dl_workers": DL_WORKERS})
        elif self.path == "/stats":
            self.send_json(200, {"indexed": len(index_ids), "dim": 512,
                                 "file": str(INDEX_FILE), "batch_size": BATCH_SIZE})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if not CLIP_READY or not load_clip():
            self.send_json(503, {"error": "CLIP non disponibile"}); return
        try:
            data = self.read_json()
        except Exception:
            self.send_json(400, {"error": "JSON non valido"}); return

        try:
            p = self.path

            if p == "/embed":
                if "image_b64" in data:
                    vec = embed_bytes(base64.b64decode(data["image_b64"]))
                else:
                    vec = embed_url(data["url"])
                if vec is None:
                    self.send_json(400, {"error": "download immagine fallito"}); return
                self.send_json(200, {"embedding": vec.tolist(), "dim": len(vec)})

            elif p == "/search":
                if "image_b64" in data:
                    vec = embed_bytes(base64.b64decode(data["image_b64"]))
                else:
                    vec = embed_url(data.get("url", ""))
                if vec is None:
                    self.send_json(400, {"error": "download immagine fallito"}); return
                k = int(data.get("limit", 5))
                min_sim = float(data.get("min_similarity", 0.0))
                results = [r for r in cosine_search(vec, k) if r["similarity"] >= min_sim]
                self.send_json(200, {"results": results, "indexed": len(index_ids)})

            elif p == "/index":
                beer_id = int(data["id"])
                if "image_b64" in data:
                    vec = embed_bytes(base64.b64decode(data["image_b64"]))
                else:
                    vec = embed_url(data["url"])
                if vec is None:
                    self.send_json(400, {"error": "download immagine fallito"}); return
                add_to_index(beer_id, vec)
                threading.Thread(target=save_index, daemon=True).start()
                self.send_json(200, {"ok": True, "id": beer_id, "indexed": len(index_ids)})

            elif p == "/index-batch":
                # Batch ottimizzato: download parallelo + CLIP batch inference
                t0 = time.time()
                items = data.get("items", [])
                batch_results = process_url_batch(items)
                ok = fail = 0
                for r in batch_results:
                    if "vec" in r:
                        add_to_index(int(r["id"]), r["vec"])
                        ok += 1
                    else:
                        fail += 1
                threading.Thread(target=save_index, daemon=True).start()
                elapsed = round(time.time() - t0, 2)
                self.send_json(200, {"ok": ok, "fail": fail,
                                     "total": len(index_ids),
                                     "elapsed_s": elapsed,
                                     "imgs_per_sec": round(ok / max(elapsed, 0.01), 1)})

            else:
                self.send_json(404, {"error": "endpoint non trovato"})

        except Exception as e:
            import traceback
            print(f"[clip] Errore {self.path}: {traceback.format_exc()}", flush=True)
            self.send_json(500, {"error": str(e)})

if __name__ == "__main__":
    print(f"[clip] Avvio su porta {CLIP_PORT} | batch={BATCH_SIZE} | dl_workers={DL_WORKERS}", flush=True)
    if CLIP_READY:
        load_clip()
    load_index()
    HTTPServer(("127.0.0.1", CLIP_PORT), Handler).serve_forever()
