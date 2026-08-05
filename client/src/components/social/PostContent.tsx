import { useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { normalizeRichContent } from "@/components/rich-text-editor";

const HASHTAG_RE = /(^|[^A-Za-z0-9_#\u00C0-\u024F])(#([A-Za-z0-9_\u00C0-\u024F]{2,30}))/g;
const MENTION_RE = /(^|[^A-Za-z0-9_@\u00C0-\u024F])(@([A-Za-z0-9_]{2,30}))/g;

function linkifyInHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return html;

  // Backward-compat: convert <span data-type="mention" data-label="..."> nodes
  // (produced by the old Mention renderHTML) to anchor links so they are
  // clickable even in posts written before the renderHTML override was added.
  const mentionSpans = root.querySelectorAll<HTMLElement>('span[data-type="mention"]');
  for (const span of mentionSpans) {
    const label = span.getAttribute("data-label") || span.textContent?.replace(/^@/, "") || "";
    if (!label) continue;
    const a = doc.createElement("a");
    a.setAttribute("href", `/user/${encodeURIComponent(label)}`);
    a.setAttribute("data-mention", label);
    a.className = "mention text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer";
    a.textContent = `@${label}`;
    span.parentNode?.replaceChild(a, span);
  }

  // Also treat <a data-type="mention"> nodes (new format) as mention anchors
  // so clicking them shows the MentionCard popup instead of navigating away.
  const mentionAnchors = root.querySelectorAll<HTMLAnchorElement>('a[data-type="mention"]');
  for (const a of mentionAnchors) {
    const label = a.getAttribute("data-label") || a.textContent?.replace(/^@/, "") || "";
    if (label && !a.hasAttribute("data-mention")) {
      a.setAttribute("data-mention", label);
    }
  }

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) textNodes.push(cur as Text);

  for (const tn of textNodes) {
    if (tn.parentElement?.closest("a")) continue;
    const text = tn.nodeValue || "";
    if (!text.trim()) continue;

    HASHTAG_RE.lastIndex = 0;
    MENTION_RE.lastIndex = 0;
    const hasHash = HASHTAG_RE.test(text);
    MENTION_RE.lastIndex = 0;
    const hasMention = MENTION_RE.test(text);
    if (!hasHash && !hasMention) continue;

    interface Match { start: number; end: number; type: "hashtag" | "mention"; value: string }
    const matches: Match[] = [];

    HASHTAG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = HASHTAG_RE.exec(text)) !== null) {
      const prefix = m[1];
      const token = m[2];
      const tag = m[3];
      const start = m.index + prefix.length;
      matches.push({ start, end: start + token.length, type: "hashtag", value: tag });
    }

    MENTION_RE.lastIndex = 0;
    while ((m = MENTION_RE.exec(text)) !== null) {
      const prefix = m[1];
      const token = m[2];
      const name = m[3];
      const start = m.index + prefix.length;
      matches.push({ start, end: start + token.length, type: "mention", value: name });
    }

    matches.sort((a, b) => a.start - b.start);

    const frag = doc.createDocumentFragment();
    let lastIdx = 0;

    for (const match of matches) {
      if (match.start < lastIdx) continue;
      if (match.start > lastIdx) {
        frag.appendChild(doc.createTextNode(text.slice(lastIdx, match.start)));
      }
      const a = doc.createElement("a");
      if (match.type === "hashtag") {
        a.setAttribute("href", `/hashtag/${encodeURIComponent(match.value.toLowerCase())}`);
        a.setAttribute("data-hashtag", match.value.toLowerCase());
        a.className = "text-primary font-semibold hover:underline cursor-pointer";
        a.textContent = `#${match.value}`;
      } else {
        a.setAttribute("href", `/user/${encodeURIComponent(match.value)}`);
        a.setAttribute("data-mention", match.value);
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

export function PostContent({ content, className }: { content: string; className?: string }) {
  const [, setLocation] = useLocation();

  const html = useMemo(
    () => linkifyInHtml(normalizeRichContent(content)),
    [content],
  );

  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a[data-hashtag], a[data-mention]") as HTMLAnchorElement | null;
    if (!anchor) return;
    e.preventDefault();

    if (anchor.hasAttribute("data-mention")) {
      // Navigate directly — popup unreliable on iOS Capacitor (fixed positioning + touch)
      const nickname = anchor.getAttribute("data-mention") || "";
      if (nickname) setLocation(`/user/${nickname}`);
    } else {
      const href = anchor.getAttribute("href") || "/";
      setLocation(href);
    }
  }, [setLocation]);

  return (
    <>
      <div
        onClick={onClick}
        className={
          className ??
          "prose prose-sm dark:prose-invert max-w-none text-sm text-stone-800 dark:text-stone-100 leading-relaxed [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 prose-a:no-underline"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
