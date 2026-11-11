// Real OCR integration check. Downloads open-source language models on first run.
import assert from "node:assert/strict";
import sharp from "sharp";
import { recognizeLabel } from "../server/label-ocr";

const png = await sharp(Buffer.from(
  '<svg width="1000" height="300"><rect width="100%" height="100%" fill="white"/><text x="40" y="140" font-family="sans-serif" font-size="64" fill="black">FERMENTA CRAFT BEER</text></svg>'
)).png().toBuffer();
const result = await recognizeLabel(`data:image/png;base64,${png.toString("base64")}`, {
  paddle: async () => ({ text: "", available: false }),
  tesseract: async () => "",
});
assert.match(result.text, /FERMENTA/i);
assert.match(result.text, /CRAFT/i);
assert.equal(result.engine, "tesseract");
console.log("PASS: real local Tesseract.js recognized the label without a cloud OCR API");
