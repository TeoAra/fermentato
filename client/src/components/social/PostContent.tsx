import { Link } from "wouter";

// Render post content with clickable #hashtags
// Supports unicode letters (e.g. #birra, #ItalianAle, #ipa3).
export function PostContent({ content, className }: { content: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  // Match #hashtag (latin + accented letters, digits, underscore). Avoid Unicode property escapes
  // for older TS targets; \w in JS doesn't match accented chars so we whitelist common ones.
  const re = /(?:^|[^A-Za-z0-9_#\u00C0-\u024F])(#([A-Za-z0-9_\u00C0-\u024F]{2,30}))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(content)) !== null) {
    // The full match may include a leading separator char; the actual hashtag starts at match[1] inside it
    const tagToken = match[1];      // includes leading '#'
    const tag = match[2];            // bare tag (no #)
    const start = match.index + match[0].indexOf(tagToken);
    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }
    parts.push(
      <Link key={`h-${key++}-${start}`} href={`/hashtag/${encodeURIComponent(tag.toLowerCase())}`}>
        <span className="text-primary font-semibold hover:underline cursor-pointer" data-testid={`hashtag-link-${tag.toLowerCase()}`}>
          #{tag}
        </span>
      </Link>,
    );
    lastIndex = start + tagToken.length;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return (
    <p className={className ?? "text-sm text-stone-800 dark:text-stone-100 whitespace-pre-wrap leading-relaxed"}>
      {parts}
    </p>
  );
}
