#!/usr/bin/env python3
"""
PaddleOCR v3 text extractor for beer label images.
Uses FLAGS_use_mkldnn=0 to avoid PIR/OneDNN incompatibility on CPU.
Usage: python3 paddle_ocr.py <image_path>
Outputs extracted text to stdout (one text block per line).
Exit codes: 0=ok, 1=error, 2=not installed
"""
import sys
import os
import warnings
warnings.filterwarnings("ignore")

# Disable MKL-DNN (OneDNN) — causes PIR attribute conversion crash on some CPU/PaddlePaddle combos
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_call_stack_level"] = "0"
os.environ["GLOG_minloglevel"] = "3"
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"


def parse_result(result):
    """
    Parse PaddleOCR result — handles both v2 list format and v3 PaddleX dict format.
    v2: [[ [[box], [text, conf]], ... ]]
    v3: [{ 'rec_texts': [...], 'rec_scores': [...], ... }]
    """
    lines = []
    if not result:
        return lines

    for item in result:
        # ── PaddleOCR v3 / PaddleX dict format ──────────────────────────────
        if isinstance(item, dict):
            texts = item.get("rec_texts", [])
            scores = item.get("rec_scores", [1.0] * len(texts))
            for text, score in zip(texts, scores):
                try:
                    if str(text).strip() and float(score) > 0.30:
                        lines.append(str(text).strip())
                except Exception:
                    continue
            continue

        # ── PaddleOCR v2 list-of-lists format ───────────────────────────────
        if isinstance(item, (list, tuple)):
            for entry in item:
                try:
                    if isinstance(entry, (list, tuple)) and len(entry) >= 2:
                        text_info = entry[1]
                        if isinstance(text_info, (list, tuple)) and len(text_info) >= 1:
                            text = str(text_info[0])
                            conf = float(text_info[1]) if len(text_info) >= 2 else 1.0
                        else:
                            text = str(text_info)
                            conf = 1.0
                        if text.strip() and conf > 0.30:
                            lines.append(text.strip())
                    elif isinstance(entry, dict):
                        text = str(entry.get("transcription", entry.get("text", "")))
                        conf = float(entry.get("score", entry.get("confidence", 1.0)))
                        if text.strip() and conf > 0.30:
                            lines.append(text.strip())
                except Exception:
                    continue

    return lines


def main():
    if len(sys.argv) < 2:
        sys.exit(0)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        sys.exit(0)

    try:
        from paddleocr import PaddleOCR
    except ImportError:
        sys.exit(2)

    try:
        # Disable slow pipeline steps — only load det + rec models (no doc orientation/unwarping)
        ocr = PaddleOCR(
            lang="en",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_angle_cls=False,
        )
        result = ocr.ocr(image_path)

        # Debug: print raw result shape to stderr for diagnostics
        print(f"DEBUG result type={type(result).__name__} len={len(result) if result else 0}", file=sys.stderr)
        if result and len(result) > 0:
            print(f"DEBUG first item type={type(result[0]).__name__} keys={list(result[0].keys()) if isinstance(result[0], dict) else 'list'}", file=sys.stderr)

        lines = parse_result(result)
        print("\n".join(lines))

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
