const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  copy: "©", reg: "®", trade: "™", ndash: "–", mdash: "—", hellip: "…",
  laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  auml: "ä", euml: "ë", iuml: "ï", ouml: "ö", uuml: "ü",
  acirc: "â", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
  ccedil: "ç", ntilde: "ñ", szlig: "ß", aring: "å", oslash: "ø",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, name: string) => {
    if (name.startsWith("#")) {
      const code = name[1]?.toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : "\uFFFD";
    }
    const decoded = ENTITIES[name.toLowerCase()];
    if (decoded === undefined) return entity;
    return name[0] === name[0].toUpperCase() ? decoded.toUpperCase() : decoded;
  });
}

/** Read legacy HTML/escaped HTML as normal text. Never produces executable HTML. */
export function descriptionToText(input: string | null | undefined, options: { trim?: boolean } = {}): string {
  let text = String(input ?? "").replace(/\r\n?/g, "\n");
  // Some imported descriptions have been escaped more than once.
  for (let pass = 0; pass < 3; pass++) {
    const decoded = decodeEntities(text);
    if (decoded === text) break;
    text = decoded;
  }
  const hasMarkup = /<\/?[a-z][^>]*>|<!--/i.test(text);
  if (hasMarkup) {
    text = text
      .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\b[^>]*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|section|article|li|ul|ol|tr|h[1-6]|blockquote|pre)\s*>/gi, "\n")
      .replace(/<\/t[dh]\s*>/gi, " ")
      .replace(/<(?:p|div|section|article|li|ul|ol|tr|h[1-6]|blockquote|pre)\b[^>]*>/gi,
        (_tag, offset: number, source: string) => {
          const before = source.slice(0, offset).replace(/<\/?[a-z][^>]*>/gi, "").replace(/[ \t]+$/, "");
          return before && !before.endsWith("\n") ? "\n" : "";
        })
      .replace(/<\/?[a-z][^>]*>/gi, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  }
  return options.trim === false ? text : text.trim();
}
