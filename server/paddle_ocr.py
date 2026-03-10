#!/usr/bin/env python3
"""
PaddleOCR v2 text extractor for beer label images.
Usage: python3 paddle_ocr.py <image_path>
Outputs extracted text to stdout (one text block per line).
Exit codes: 0=ok, 1=error, 2=not installed
"""
import sys
import os
import warnings
warnings.filterwarnings("ignore")

os.environ["FLAGS_call_stack_level"] = "0"
os.environ["GLOG_minloglevel"] = "3"
os.environ["KMP_AFFINITY"] = "disabled"
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
        # PaddleOCR v2 API
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            use_gpu=False,
            show_log=False,
            det_db_thresh=0.3,
            det_db_box_thresh=0.45,
            rec_batch_num=4,
        )
        result = ocr.ocr(image_path, cls=True)
        lines = []

        if result and result[0]:
            for line in result[0]:
                if not line or len(line) < 2:
                    continue
                text_info = line[1]
                if isinstance(text_info, (list, tuple)):
                    text = str(text_info[0]) if len(text_info) > 0 else ""
                    conf = float(text_info[1]) if len(text_info) > 1 else 1.0
                else:
                    text = str(text_info)
                    conf = 1.0

                if text.strip() and conf > 0.30:
                    lines.append(text.strip())

        print("\n".join(lines))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
