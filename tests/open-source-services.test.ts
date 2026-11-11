import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";
import { recognizeLabel, isLabelImage, OcrBusyError } from "../server/label-ocr";
import { translateText, translateToItalian, translationAvailable } from "../server/translate";

const image = "data:image/png;base64,aGVsbG8=";
const noPaddle = async () => ({ text: "", available: false });
const noNative = async () => "";

test("OCR validates types and accepts only supported base64 images", () => {
  assert.ok(isLabelImage(image));
  for (const invalid of [null, 123, {}, "data:image/svg+xml;base64,abcd", "https://example.com/photo.jpg", "data:image/png;base64,@@@"]) {
    assert.equal(isLabelImage(invalid), false);
  }
});

test("OCR prefers local engines, then uses WASM, without cloud providers", async () => {
  const never = async (): Promise<string> => { throw Error("Unexpected fallback"); };
  assert.deepEqual(await recognizeLabel(image, {
    paddle: async () => ({ text: "  Birra locale  ", available: true }),
    tesseract: never, portable: never,
  }), { text: "Birra locale", exitCode: 1, engine: "paddleocr" });
  assert.equal((await recognizeLabel(image, {
    paddle: noPaddle, tesseract: async () => "Etichetta locale", portable: never,
  })).engine, "tesseract");
  assert.equal((await recognizeLabel(image, {
    paddle: noPaddle, tesseract: noNative, portable: async () => "Etichetta WASM",
  })).text, "Etichetta WASM");
  assert.equal((await recognizeLabel(image, {
    paddle: noPaddle, tesseract: noNative, portable: async () => "",
  })).exitCode, 0);
});

test("OCR rejects concurrent work and releases its lock on failure", async () => {
  let finish!: (value: string) => void;
  const first = recognizeLabel(image, {
    paddle: noPaddle, tesseract: noNative,
    portable: () => new Promise(resolve => { finish = resolve; }),
  });
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(recognizeLabel(image, { paddle: noPaddle, tesseract: noNative }), OcrBusyError);
  finish("Birra");
  await first;
  await assert.rejects(recognizeLabel(image, {
    paddle: noPaddle, tesseract: noNative, portable: async () => { throw Error("offline"); },
  }), /offline/);
  assert.equal((await recognizeLabel(image, {
    paddle: noPaddle, tesseract: noNative, portable: async () => "Ripristinato",
  })).exitCode, 1);
});

test("LibreTranslate stays local, sends plain text, preserves originals on failure", async () => {
  const old = process.env.LIBRETRANSLATE_URL;
  const requests: any[] = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);
    requests.push({ path: req.url, data });
    if (data.q === "fail") { res.writeHead(503).end(); return; }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ translatedText: "Birra artigianale\nLocale" }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    delete process.env.LIBRETRANSLATE_URL;
    assert.equal(translationAvailable(), false);
    assert.equal(await translateText("Craft beer", "it"), null);
    const address = server.address() as { port: number };
    process.env.LIBRETRANSLATE_URL = `http://127.0.0.1:${address.port}/`;
    assert.equal(translationAvailable(), true);
    assert.equal(await translateToItalian("Craft beer"), "Birra artigianale\nLocale");
    assert.deepEqual(requests[0], {
      path: "/translate",
      data: { q: "Craft beer", source: "auto", target: "it", format: "text" },
    });
    assert.equal(await translateText("fail", "it"), null);
    await translateText("Craft beer", "en-US");
    assert.equal(requests.at(-1).data.target, "en");
  } finally {
    if (old === undefined) delete process.env.LIBRETRANSLATE_URL;
    else process.env.LIBRETRANSLATE_URL = old;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("Runtime, scripts and dependencies contain no Google AI endpoints or keys", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
  }
  for (const path of [...files("server"), ...files("scripts"), "package.json", "package-lock.json"]) {
    const content = readFileSync(path, "utf8");
    assert.doesNotMatch(content, /generativelanguage\.googleapis\.com|GEMINI_API_KEY|@google\/(?:generative-ai|genai)/i, path);
  }
  assert.doesNotMatch(readFileSync("server/routes.ts", "utf8"), /api\.ocr\.space|OCR_SPACE_KEY/);
});
