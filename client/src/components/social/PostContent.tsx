import { useMemo } from "react";
import { useLocation } from "wouter";
import { normalizeRichContent } from "@/components/rich-text-editor";

const HASHTAG_RE = /(^|[^A-Za-z0-9_#\u00C0-\u024F])(#([A-Za-z0-9_\u00C0-\u024F]{2,30}))/g;
const MENTION_RE = /(^|[^A-Za-z0-9_@\u00C0-\u024F])(@([A-Za-z0-9_]{2,30}))/g;

/**
 * Walks HTML text nodes replacing #hashtag and @mention occurrences with
 * anchor tags. Skips text inside existing <a> tags to avoid double-wrapping.
 */
function linkifyInHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return html;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) textNodes.push(cur as Text);

  for (const tn of textNodes) {
    // Skip text inside <a> to avoid double-wrapping
    if (tn.parentElement?.closest("a")) continue;
    const text = tn.nodeValue || "";
    if (!text.trim()) continue;

    // Check if text needs any linkification
    HASHTAG_RE.lastIndex = 0;
    MENTION_RE.lastIndex = 0;
    const hasHash = HASHTAG_RE.test(text);
    MENTION_RE.lastIndex = 0;
    const hasMention = MENTION_RE.test(text);
    if (!hasHash && !hasMention) continue;

    // Build a unified replacement by scanning for both patterns
    const frag = doc.createDocumentFragment();
    let lastIdx = 0;

    // Collect all matches with their positions
    interface Match { start: number; end: number; type: "hashtag" | "mention"; value: string; prefix: string }
    const matches: Match[] = [];

    HASHTAG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = HASHTAG_RE.exec(text)) !== null) {
      const prefix = m[1];          // leading non-word char (or empty at ^)
      const token = m[2];           // e.g. "#ipa"
      const tag = m[3];             // bare tag
      const start = m.index + prefix.length;
      matches.push({ start, end: start + token.length, type: "hashtag", value: tag, prefix });
    }

    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(text)) !== null) {
      const prefix = m[1];
      const token = m[2];           // e.g. "@username"
      const name = m[3];            // bare username
      const start = m.index + prefix.length;
      matches.push({ start, end: start + token.length, type: "mention", value: name, prefix });
    }

    // Sort by position (ascending) and filter overlaps
    matches.sort((a, b) => a.start - b.start);

    for (const match of matches) {
      if (match.start < lastIdx) continue; // overlapping — skip
      if (match.start > lastIdx) {
        frag.appendChild(doc.createTextNode(text.slice(lastIdx, match.start)));
      }
      const a = doc.createElement("a");
      if (match.type === "hashtag") {
        a.setAttribute("href", `/hashtag/${encodeURIComponent(match.value.toLowerCase())}`);
        a.setAttribute("data-hashtag", match.value.toLowerCase());
        a.setAttribute("data-testid", `hashtag-link-${match.value.toLowerCase()}`);
        a.className = "text-primary font-semibold hover:underline cursor-pointer";
        a.textContent = `#${match.value}`;
      } else {
        a.setAttribute("href", `/user/${encodeURIComponent(match.value)}`);
        a.setAttribute("data-mention", match.value);
        a.setAttribute("data-testid", `mention-link-${match.value}`);
        a.className = "text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer";
        a.textContent = `@${match.value}`;
      }
      frag.appendChild(a);
      lastIdx = match.end;
    }

    if (lastIdx < text.length) {
      frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
    }

    tn.parentNode?.replaceChild(frag, tn);
  }

  return root.innerHTML;
}

/**
 * Renders post content with clickable #hashtags and @mentions.
 * Supports both legacy plain-text posts and HTML from the rich text editor.
 */
export function PostContent({ content, className }: { content: string; className?: string }) {
  const [, setLocation] = useLocation();
  const html = useMemo(
    () => linkifyInHtml(normalizeRichContent(content)),
    [content],
  );

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a[data-hashtag], a[data-mention]") as HTMLAnchorElement | null;
    if (anchor) {
      e.preventDefault();
      const href = anchor.getAttribute("href") || "/";
      setLocation(href);
    }
  };

  return (
    <div
      onClick={onClick}
      className={
        className ??
        "prose prose-sm dark:prose-invert max-w-none text-sm text-stone-800 dark:text-stone-100 leading-relaxed [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 prose-a:no-underline"
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
