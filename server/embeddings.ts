// Gemini text-embedding-004 — 768-dim vectors, free within API quota
// Used for semantic scan memory and (optionally) beer name search.

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text?.trim()) return null;

  try {
    const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text: text.trim() }] } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.embedding?.values ?? null;
  } catch {
    return null;
  }
}

// Format a vector array as PostgreSQL literal: '[0.1,0.2,...]'
export function pgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}

// Build a meaningful embedding input string for a beer
export function beerEmbedText(name: string, breweryName?: string | null, style?: string | null): string {
  return [name, breweryName, style].filter(Boolean).join(" — ");
}
