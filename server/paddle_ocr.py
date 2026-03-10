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
        # PaddleOCR v3 — minimal params, mkldnn disabled
        ocr = PaddleOCR(lang="en")
        result = ocr.ocr(image_path)
        lines = []

        if result:
            for page in result:
                if not page:
                    continue
                for item in page:
                    try:
                        # v2/v3 legacy: [[box], [text, conf]]
                        if isinstance(item, (list, tuple)) and len(item) >= 2:
                            text_info = item[1]
                            if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                                text = str(text_info[0])
                                conf = float(text_info[1])
                            elif isinstance(text_info, (list, tuple)) and len(text_info) == 1:
                                text = str(text_info[0])
                                conf = 1.0
                            else:
                                text = str(text_info)
                                conf = 1.0
                        # v3 dict format
                        elif isinstance(item, dict):
                            text = str(item.get("transcription", item.get("text", "")))
                            conf = float(item.get("score", item.get("confidence", 1.0)))
                        else:
                            continue

                        if text.strip() and conf > 0.35:
                            lines.append(text.strip())
                    except Exception:
                        continue

        print("\n".join(lines))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
