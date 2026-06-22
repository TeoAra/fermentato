// Shared search normalization + SQL fragment builder for beer search.
//
// Two beer-search code paths used to drift and both shared the same two bugs:
//  1) accent mismatch — the indexed columns are unaccent_immutable(...) but the
//     search term kept its accent (e.g. "è"), so accented queries could only
//     match via the (non-unaccented) compact sub-queries and were fragile.
//  2) per-term `LIMIT 300` (no ORDER BY) before an INTERSECT — common short
//     words ("è", "la") match thousands of rows, get arbitrarily truncated to
//     300, and the INTERSECT then dropped the real target → ZERO results for
//     specific multi-word queries like "Quella è la porta!".
//
// Fix: normalize the query once (unaccent + strip punctuation + drop
// stopwords/short tokens), then generate candidates as a UNION of the exact
// phrase plus the most selective tokens (each generously capped), and apply the
// FULL "every meaningful token must match" predicate only on that small
// candidate set (uncapped, so nothing is truncated away).

export const BEER_SEARCH_CANDIDATE_CAP = 4000;

// Italian + English articles/prepositions/conjunctions. Only words that are
// pure noise in a beer/brewery name search — never beer-relevant terms (ipa,
// ale, sour, rye, dry, hop, red, …). Short tokens (<3 chars) are dropped by the
// length filter anyway; this set mainly removes 3+ char stopwords.
const SEARCH_STOPWORDS = new Set<string>([
  // Italian
  "e", "ed", "la", "le", "lo", "il", "gli", "un", "una", "uno", "di", "da", "de",
  "del", "dei", "della", "delle", "dello", "degli", "dal", "dalla", "dallo",
  "al", "allo", "alla", "agli", "alle", "in", "nel", "nella", "nello", "su",
  "sul", "sulla", "per", "con", "tra", "fra", "che", "chi", "non", "ne", "si",
  "se", "ad", "come", "piu",
  // English
  "the", "and", "or", "of", "to", "on", "for", "with", "by", "at", "as", "is",
  "it", "from", "this", "that", "an",
]);

export function unaccentText(s: string): string {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface NormalizedBeerSearch {
  /** unaccented, lowercased, punctuation→space, single-spaced */
  phrase: string;
  /** phrase with all spaces removed (for compact / no-space matching) */
  phraseCompact: string;
  /** every normalized token */
  allTokens: string[];
  /** tokens worth requiring (len>=3 or all-digit len>=2) minus stopwords; falls back to allTokens */
  meaningful: string[];
  /** up to 3 most selective (longest) meaningful tokens, used to seed candidates */
  drivers: string[];
}

export function normalizeBeerSearch(raw: string): NormalizedBeerSearch {
  const unacc = unaccentText((raw || "").toLowerCase());
  // Replace any non-letter/non-digit (unicode aware) with a space.
  const phrase = unacc.replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const phraseCompact = phrase.replace(/\s+/g, "");
  const allTokens = phrase.length ? phrase.split(" ") : [];

  let meaningful = allTokens.filter(
    (t) => (t.length >= 3 || (/^\d+$/.test(t) && t.length >= 2)) && !SEARCH_STOPWORDS.has(t),
  );
  if (meaningful.length === 0) meaningful = allTokens.slice();

  // Deduplicate, then pick the longest tokens as a selectivity heuristic.
  const drivers = [...new Set(meaningful)].sort((a, b) => b.length - a.length).slice(0, 3);

  return { phrase, phraseCompact, allTokens, meaningful, drivers };
}

export interface BeerSearchFragments {
  /** "candidate_ids AS ( ... )" — the last CTE */
  candidateCTE: string;
  /** "" or "AND (...) AND (...)" — full uncapped AND predicate over meaningful tokens */
  matchFilter: string;
  /** "(...)" numeric relevance score expression */
  scoreExpr: string;
}

/**
 * Builds the candidate CTE + match filter + score expression for beer search.
 * Pushes its parameter values onto `params` (in order); the caller may push
 * further parameters (extra filters) AFTER calling this without colliding.
 *
 * IMPORTANT: candidate sub-queries use the *exact* indexed expressions (no
 * COALESCE on brewery name) so the GIN trigram indexes are used. The final
 * filter/score run on the small candidate set, so they use COALESCE for
 * null-safety (LEFT JOIN breweries) without caring about index matching.
 */
export function buildBeerSearchFragments(
  n: NormalizedBeerSearch,
  params: any[],
  cap: number = BEER_SEARCH_CANDIDATE_CAP,
): BeerSearchFragments {
  const P = (v: any) => {
    params.push(v);
    return `$${params.length}`;
  };

  // No usable tokens (e.g. filters-only search): scan a bounded slice.
  if (n.meaningful.length === 0) {
    return {
      candidateCTE: `candidate_ids AS (SELECT id FROM beers LIMIT 5000)`,
      matchFilter: "",
      scoreExpr: "1",
    };
  }

  const pPhrase = P(`%${n.phrase}%`);
  const pPhraseCompact = P(`%${n.phraseCompact}%`);
  const pTok = new Map<string, string>();
  for (const t of n.meaningful) if (!pTok.has(t)) pTok.set(t, P(`%${t}%`));

  // Index-matching expressions (used in candidate sub-queries).
  const beerNameUnacc = `unaccent_immutable(lower(b.name::text))`;
  const beerStyle = `lower(COALESCE(b.style, '')::text)`;
  const beerNameComp = `regexp_replace(lower(b.name::text), '\\s+', '', 'g')`;
  const brNameUnaccIdx = `unaccent_immutable(lower(br.name::text))`;
  const brNameCompIdx = `regexp_replace(lower(br.name::text), '\\s+', '', 'g')`;
  // Null-safe expressions (used in final filter/score over LEFT JOIN brewery).
  const brNameUnacc = `unaccent_immutable(lower(COALESCE(br.name, '')::text))`;
  const brNameComp = `regexp_replace(lower(COALESCE(br.name, '')::text), '\\s+', '', 'g')`;

  const tokenSubqueries = (ph: string): string[] => [
    `(SELECT b.id FROM beers b WHERE ${beerNameUnacc} LIKE ${ph} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b WHERE ${beerStyle} LIKE ${ph} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b JOIN breweries br ON b.brewery_id = br.id WHERE ${brNameUnaccIdx} LIKE ${ph} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b WHERE ${beerNameComp} LIKE ${ph} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b JOIN breweries br ON b.brewery_id = br.id WHERE ${brNameCompIdx} LIKE ${ph} LIMIT ${cap})`,
  ];

  // Candidate set: UNION of exact-phrase matches + the most selective tokens.
  // A beer is a candidate if it matches the phrase OR any driver token; the
  // final filter then narrows to "matches every meaningful token". Because the
  // drivers are the most selective tokens, the target survives their generous
  // cap, so the truncation bug cannot drop it.
  const members: string[] = [
    `(SELECT b.id FROM beers b WHERE ${beerNameUnacc} LIKE ${pPhrase} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b JOIN breweries br ON b.brewery_id = br.id WHERE ${brNameUnaccIdx} LIKE ${pPhrase} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b WHERE ${beerNameComp} LIKE ${pPhraseCompact} LIMIT ${cap})`,
    `(SELECT b.id FROM beers b JOIN breweries br ON b.brewery_id = br.id WHERE ${brNameCompIdx} LIKE ${pPhraseCompact} LIMIT ${cap})`,
  ];
  for (const d of n.drivers) members.push(...tokenSubqueries(pTok.get(d)!));

  const candidateCTE = `candidate_ids AS (\n${members.join("\n          UNION\n")}\n        )`;

  // Full AND predicate (uncapped, on the small candidate set).
  const perToken = n.meaningful.map((m) => {
    const ph = pTok.get(m)!;
    return `(${beerNameUnacc} LIKE ${ph} OR ${beerStyle} LIKE ${ph} OR ${brNameUnacc} LIKE ${ph} OR ${beerNameComp} LIKE ${ph} OR ${brNameComp} LIKE ${ph})`;
  });
  const matchFilter = `AND ${perToken.join("\n        AND ")}`;

  // Relevance: token hits on name (4) / brewery (3) / style (1), plus phrase
  // bonuses so exact names rank first.
  const scoreParts = n.meaningful.map((m) => {
    const ph = pTok.get(m)!;
    return `(CASE WHEN ${beerNameUnacc} LIKE ${ph} THEN 4 ELSE 0 END
        + CASE WHEN ${brNameUnacc} LIKE ${ph} OR ${brNameComp} LIKE ${ph} THEN 3 ELSE 0 END
        + CASE WHEN ${beerStyle} LIKE ${ph} THEN 1 ELSE 0 END)`;
  });
  const scoreExpr = `(${scoreParts.join("\n        + ")}
        + CASE WHEN ${beerNameUnacc} LIKE ${pPhrase} THEN 6 ELSE 0 END
        + CASE WHEN unaccent_immutable(lower(b.name::text || ' ' || COALESCE(br.name::text, ''))) LIKE ${pPhrase} THEN 2 ELSE 0 END)`;

  return { candidateCTE, matchFilter, scoreExpr };
}
