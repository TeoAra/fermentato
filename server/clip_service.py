"""
CLIP Embedding Service for Fermenta.to
Runs on VPS, exposes a simple HTTP API for generating image embeddings.
"""
import sys
import os
import json
import base64
import io
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from urllib.error import URLError
import urllib.parse

try:
    import torch
    import clip
    from PIL import Image
    import numpy as np
    CLIP_READY = True
except ImportError as e:
    print(f"[clip_service] Import error: {e}", flush=True)
    CLIP_READY = False

MODEL_NAME = "ViT-B/32"
model = None
preprocess = None
device = "cpu"

def load_model():
    global model, preprocess, device
    if model is not None:
        return True
    try:
        print(f"[clip_service] Loading CLIP {MODEL_NAME}...", flush=True)
        model, preprocess = clip.load(MODEL_NAME, device=device)
        model.eval()
        print("[clip_service] CLIP loaded ok", flush=True)
        return True
    except Exception as e:
        print(f"[clip_service] Failed to load CLIP: {e}", flush=True)
        return False

def embed_image_pil(pil_img):
    img_tensor = preprocess(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model.encode_image(img_tensor)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().flatten().tolist()

def embed_from_bytes(img_bytes):
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return embed_image_pil(pil_img)

def embed_from_url(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=10) as resp:
        return embed_from_bytes(resp.read())

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default access logs

    def send_json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"ok": True, "clip_ready": CLIP_READY and model is not None})
        else:
            self.send_json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except Exception:
            self.send_json(400, {"error": "invalid json"})
            return

        if not CLIP_READY:
            self.send_json(503, {"error": "CLIP not available"})
            return

        if not load_model():
            self.send_json(503, {"error": "CLIP model failed to load"})
            return

        try:
            if self.path == "/embed":
                if "image_b64" in data:
                    img_bytes = base64.b64decode(data["image_b64"])
                    vec = embed_from_bytes(img_bytes)
                elif "url" in data:
                    vec = embed_from_url(data["url"])
                else:
                    self.send_json(400, {"error": "need image_b64 or url"})
                    return
                self.send_json(200, {"embedding": vec, "dim": len(vec)})

            elif self.path == "/embed-batch":
                results = []
                for item in data.get("items", []):
                    try:
                        if "url" in item:
                            vec = embed_from_url(item["url"])
                            results.append({"id": item.get("id"), "embedding": vec, "ok": True})
                        else:
                            results.append({"id": item.get("id"), "ok": False, "error": "no url"})
                    except Exception as e:
                        results.append({"id": item.get("id"), "ok": False, "error": str(e)})
                self.send_json(200, {"results": results})

            else:
                self.send_json(404, {"error": "not found"})

        except Exception as e:
            print(f"[clip_service] Error: {e}", flush=True)
            self.send_json(500, {"error": str(e)})

if __name__ == "__main__":
    port = int(os.environ.get("CLIP_PORT", 5002))
    print(f"[clip_service] Starting on port {port}...", flush=True)
    if CLIP_READY:
        load_model()
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"[clip_service] Listening on 127.0.0.1:{port}", flush=True)
    server.serve_forever()
