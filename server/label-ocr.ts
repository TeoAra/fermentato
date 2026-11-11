import { createWorker, PSM } from "tesseract.js";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class OcrBusyError extends Error {}

type LocalEngines = {
  paddle: (image: string) => Promise<{ text: string; available: boolean }>;
  tesseract: (image: string) => Promise<string>;
  portable?: (image: string) => Promise<string>;
};

// Bound CPU/memory usage: never start multiple OCR workers in this process.
let busy = false;

async function portableTesseract(image: string): Promise<string> {
  const cachePath = join(tmpdir(), "fermenta-tesseract");
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker("ita+eng", 1, { cachePath });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(Buffer.from(image.split(",")[1], "base64"));
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export function isLabelImage(image: unknown): image is string {
  return typeof image === "string"
    && /^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
    && image.length <= 10 * 1024 * 1024;
}

export async function recognizeLabel(image: string, engines: LocalEngines) {
  if (busy) throw new OcrBusyError("Scanner occupato. Riprova tra qualche secondo.");
  busy = true;
  try {
    const paddle = await engines.paddle(image);
    if (paddle.text.trim().length >= 3) {
      return { text: paddle.text.trim(), exitCode: 1, engine: "paddleocr" };
    }
    const native = await engines.tesseract(image);
    if (native.trim().length >= 3) {
      return { text: native.trim(), exitCode: 1, engine: "tesseract" };
    }
    // WASM fallback also works when the VPS has no Python or native Tesseract.
    // Language data is downloaded once, then cached; no recognition API is used.
    const text = await (engines.portable ?? portableTesseract)(image);
    return { text, exitCode: text.trim().length >= 3 ? 1 : 0, engine: "tesseract" };
  } finally {
    busy = false;
  }
}
