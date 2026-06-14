export async function generateEmbedding(_text: string): Promise<number[] | null> {
  return null;
}

export function pgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}

export function beerEmbedText(name: string, breweryName?: string | null, style?: string | null): string {
  return [name, breweryName, style].filter(Boolean).join(" — ");
}
