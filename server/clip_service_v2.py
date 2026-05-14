"""
CLIP Embedding Service v2 for Fermenta.to
- Stores embeddings in a .npy file on disk (no pgvector needed)
- Loads into memory at startup for fast in-memory cosine similarity
- Endpoints:
  POST /embed          -> embed a single image (base64 or url), returns vector
  POST /search         -> embed image + search similar beers, returns [{id, similarity}]
  POST /index          -> add/update a single beer's embedding to the index
  POST /index-batch    -> batch-add embeddings from URLs
  GET  /health         -> health + stats
  GET  /stats          -> index stats
"""
import sys, os, json, base64, io, struct, time, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from pathlib import Path

INDEX_FILE = Path(os.environ.get("CLIP_INDEX_FILE", "/www/nodeapps/fermenta/data/clip_index.npz"))
CLIP_PORT  = int(os.environ.get("CLIP_PORT", 5002))

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
# In-memory index: numpy float32 (N, 512) + list of beer IDs
index_vecs: "np.ndarray | None" = None
index_ids: list = []

def load_clip():
    global model, preprocess
    if model: return True
    print("[clip] Loading CLIP ViT-B/32...", flush=True)
    try:
        model, preprocess = clip.load("ViT-B/32", device="cpu")
        model.eval()
        print("[clip] CLIP ready", flush=True)
        return True
    except Exception as e:
        print(f"[clip] Load failed: {e}", flush=True)
        return False

def load_index():
    global index_vecs, index_ids
    if not INDEX_FILE.exists():
        print(f"[clip] No index file at {INDEX_FILE}", flush=True)
        return
    try:
        data = np.load(str(INDEX_FILE), allow_pickle=True)
        index_vecs = data["vecs"].astype(np.float32)
        index_ids  = data["ids"].tolist()
        print(f"[clip] Index loaded: {len(index_ids)} beers", flush=True)
    except Exception as e:
        print(f"[clip] Index load error: {e}", flush=True)

def save_index():
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    if index_vecs is None or len(index_ids) == 0: return
    np.savez(str(INDEX_FILE), vecs=index_vecs, ids=np.array(index_ids))

def embed_pil(pil_img):
    t = preprocess(pil_img).unsqueeze(0)
    with torch.no_grad():
        f = model.encode_image(t)
        f = f / f.norm(dim=-1, keepdim=True)
    return f.cpu().numpy().flatten().astype(np.float32)

def embed_bytes(b): return embed_pil(Image.open(io.BytesIO(b)).convert("RGB"))
def embed_url(url):
    r = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(r, timeout=12) as resp: return embed_bytes(resp.read())

def cosine_search(q_vec, k=5):
    if index_vecs is None or len(index_ids) == 0: return []
    sims = index_vecs @ q_vec  # (N,) cosine sim (vecs already normalized)
    top_k = int(min(k, len(index_ids)))
    idx = np.argpartition(sims, -top_k)[-top_k:]
    idx = idx[np.argsort(sims[idx])[::-1]]
    return [{"id": int(index_ids[i]), "similarity": float(sims[i])} for i in idx]

def add_to_index(beer_id: int, vec: "np.ndarray"):
    global index_vecs, index_ids
    with _lock:
        if beer_id in index_ids:
            pos = index_ids.index(beer_id)
            index_vecs[pos] = vec
        else:
            index_ids.append(beer_id)
            if index_vecs is None:
                index_vecs = vec.reshape(1, -1)
            else:
                index_vecs = np.vstack([index_vecs, vec.reshape(1, -1)])

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
            self.send_json(200, {
                "ok": True, "clip_ready": CLIP_READY and model is not None,
                "index_size": len(index_ids)
            })
        elif self.path == "/stats":
            self.send_json(200, {"indexed": len(index_ids), "dim": 512, "file": str(INDEX_FILE)})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if not CLIP_READY or not load_clip():
            self.send_json(503, {"error": "CLIP unavailable"}); return
        try:
            data = self.read_json()
        except Exception:
            self.send_json(400, {"error": "invalid json"}); return

        try:
            p = self.path
            if p == "/embed":
                vec = embed_bytes(base64.b64decode(data["image_b64"])) if "image_b64" in data else embed_url(data["url"])
                self.send_json(200, {"embedding": vec.tolist(), "dim": len(vec)})

            elif p == "/search":
                vec = embed_bytes(base64.b64decode(data["image_b64"])) if "image_b64" in data else embed_url(data.get("url",""))
                k = int(data.get("limit", 5))
                min_sim = float(data.get("min_similarity", 0.0))
                results = [r for r in cosine_search(vec, k) if r["similarity"] >= min_sim]
                self.send_json(200, {"results": results, "indexed": len(index_ids)})

            elif p == "/index":
                beer_id = int(data["id"])
                vec = embed_url(data["url"])
                add_to_index(beer_id, vec)
                # Async save
                threading.Thread(target=save_index, daemon=True).start()
                self.send_json(200, {"ok": True, "id": beer_id})

            elif p == "/index-batch":
                ok = fail = 0
                for item in data.get("items", []):
                    try:
                        vec = embed_url(item["url"])
                        add_to_index(int(item["id"]), vec)
                        ok += 1
                    except Exception as e:
                        fail += 1
                save_index()
                self.send_json(200, {"ok": ok, "fail": fail, "total": len(index_ids)})

            else:
                self.send_json(404, {"error": "not found"})

        except Exception as e:
            print(f"[clip] Error in {self.path}: {e}", flush=True)
            self.send_json(500, {"error": str(e)})

if __name__ == "__main__":
    print(f"[clip] Starting on port {CLIP_PORT}...", flush=True)
    if CLIP_READY:
        load_clip()
    load_index()
    HTTPServer(("127.0.0.1", CLIP_PORT), Handler).serve_forever()
