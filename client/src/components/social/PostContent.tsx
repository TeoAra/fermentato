import { useMemo } from "react";
import { useLocation } from "wouter";
import { normalizeRichContent } from "@/components/rich-text-editor";

const HASHTAG_RE = /(^|[^A-Za-z0-9_#\u00C0-\u024F])(#([A-Za-z0-9_\u00C0-\u024F]{2,30}))/g;

/**
 * Walks HTML, replacing #hashtag occurrences inside text nodes with anchor
 * tags. Skips text inside existing <a> tags so we don't double-wrap. Returns
 * sanitized-ish HTML (safe because input came from our own normalize helper
 * which escapes plain text; HTML produced by the rich text editor is already
 * sanitized by Tiptap's schema).
 */
function linkifyHashtagsInHtml(html: string): string {
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
    if (tn.parentElement?.closest("a")) continue;
    const text = tn.nodeValue || "";
    HASHTAG_RE.lastIndex = 0;
    if (!HASHTAG_RE.test(text)) continue;
    HASHTAG_RE.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = HASHTAG_RE.exec(text)) !== null) {
      const tagToken = m[2]; // e.g. "#ipa"
      const tag = m[3];       // bare tag
      const start = m.index + m[0].indexOf(tagToken);
      if (start > lastIdx) frag.appendChild(doc.createTextNode(text.slice(lastIdx, start)));
      const a = doc.createElement("a");
      a.setAttribute("href", `/hashtag/${encodeURIComponent(tag.toLowerCase())}`);
      a.setAttribute("data-hashtag", tag.toLowerCase());
      a.setAttribute("data-testid", `hashtag-link-${tag.toLowerCase()}`);
      a.className = "text-primary font-semibold hover:underline cursor-pointer";
      a.textContent = `#${tag}`;
      frag.appendChild(a);
      lastIdx = start + tagToken.length;
    }
    if (lastIdx < text.length) frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
    tn.parentNode?.replaceChild(frag, tn);
  }
  return root.innerHTML;
}

// Render post content with clickable #hashtags. Supports both legacy plain-text
// posts (with \n line breaks) and new HTML posts from the rich text editor.
export function PostContent({ content, className }: { content: string; className?: string }) {
  const [, setLocation] = useLocation();
  const html = useMemo(
    () => linkifyHashtagsInHtml(normalizeRichContent(content)),
    [content],
  );

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a[data-hashtag]") as HTMLAnchorElement | null;
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
