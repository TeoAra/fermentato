---
name: Gemini fully removed
description: All Gemini API calls have been removed from the codebase to eliminate billing costs.
---

All Google Generative Language API usage was removed. The GEMINI_API_KEY env var is no longer read by any server file.

**Files changed and their replacement:**
- `server/translate.ts` — translateToItalian/translateText stub to return null; looksItalian() kept.
- `server/embeddings.ts` — generateEmbedding stubs to return null; pgVector/beerEmbedText kept (still imported elsewhere).
- `server/bot-commands.ts` — parseCommand replaced with regex-based Italian parser; handles all BotAction types via regex.
- `server/routes.ts` — runGeminiOCR removed; PaddleOCR is now primary OCR engine in /api/scan/ocr.
- `server/beer-image-finder.ts` — googleViaGeminiGrounding, geminiPickBestImage, scrapeWhataBeerPage, extractOgImages all removed; findBestBeerImage uses Untappd + brewery og:image + DuckDuckGo.
- `server/brewery-image-finder.ts` — googlePagesForBrewery, geminiPickBestLogo, scrapeWhataBeerBreweryLogo, fetchImageBase64 all removed; findBestBreweryLogo uses Untappd + website.

**Why:** User chose "Opzione A — rimuovi tutto Gemini" to eliminate unexpected billing from gemini-2.5-flash vision/grounding calls.

**How to apply:** If Gemini is ever re-enabled, the bot parser (regex) is the most likely candidate for replacement with an LLM — the regex handles common cases but lacks natural language understanding for ambiguous commands.
