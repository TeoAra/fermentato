import { useEditor, EditorContent } from "@tiptap/react";
import DOMPurify from "isomorphic-dompurify";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import { useEffect, useCallback, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Link as LinkIcon,
  Highlighter, Heading1, Heading2, Heading3,
  Undo, Redo, Type, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Mention suggestion types ──────────────────────────────────────────────────
type MentionItem = { id: string; label: string; avatarUrl?: string | null };

type SuggestionPopupState = {
  items: MentionItem[];
  selectedIndex: number;
  rect: DOMRect | null;
  command: ((item: MentionItem) => void) | null;
} | null;

// ── Floating mention suggestion popup ────────────────────────────────────────
interface MentionSuggestionListProps {
  state: SuggestionPopupState;
  onSelect: (item: MentionItem) => void;
  keyHandlerRef: React.MutableRefObject<((e: KeyboardEvent) => boolean) | null>;
}

function MentionSuggestionList({ state, onSelect, keyHandlerRef }: MentionSuggestionListProps) {
  const [localIndex, setLocalIndex] = useState(0);

  useEffect(() => {
    setLocalIndex(state?.selectedIndex ?? 0);
  }, [state?.selectedIndex, state?.items]);

  // Register keyboard handler for the editor to call
  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (!state?.items?.length) return false;
      if (e.key === "ArrowDown") {
        setLocalIndex(i => (i + 1) % state.items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        setLocalIndex(i => (i - 1 + state.items.length) % state.items.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const item = state.items[localIndex];
        if (item) { onSelect(item); }
        return true;
      }
      if (e.key === "Escape") {
        return true; // handled by suggestion plugin
      }
      return false;
    };
    return () => { keyHandlerRef.current = null; };
  }, [state, localIndex, onSelect]);

  if (!state?.items?.length || !state.rect) return null;

  const rect = state.rect;
  // Position popup below the caret
  const top = rect.bottom + window.scrollY + 6;
  const left = Math.max(8, rect.left + window.scrollX);

  return createPortal(
    <div
      className="fixed z-[9999] bg-white dark:bg-[#1A1D24] border border-stone-200 dark:border-[#23262E] rounded-xl shadow-xl overflow-hidden"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        minWidth: "200px",
        maxWidth: "280px",
      }}
      onMouseDown={e => e.preventDefault()} // keep editor focus
    >
      <ul>
        {state.items.map((item, idx) => (
          <li key={item.id}>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(item); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors text-sm
                ${idx === localIndex
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
                  : "hover:bg-stone-50 dark:hover:bg-[#23262E] text-stone-800 dark:text-stone-200"
                }`}
            >
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <span className="text-amber-700 dark:text-amber-400 text-xs font-bold">
                    {item.label[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
              )}
              <span className="font-medium truncate">@{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}

// ── Fetch mention suggestions from the API ────────────────────────────────────
async function fetchMentionItems(query: string): Promise<MentionItem[]> {
  if (!query || query.length < 2) return [];
  try {
    const r = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    if (!r.ok) return [];
    const data: Array<{ id: string; nickname?: string; first_name?: string; last_name?: string; profile_image_url?: string | null }> = await r.json();
    return data.slice(0, 5).map(u => ({
      id: String(u.id),
      label: u.nickname || [u.first_name, u.last_name].filter(Boolean).join(" ") || "utente",
      avatarUrl: u.profile_image_url ?? null,
    }));
  } catch {
    return [];
  }
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxChars?: number;
  className?: string;
  /** When true, enables inline @mention autocomplete (for post composers) */
  enableMentions?: boolean;
}

const ToolbarButton = ({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    title={title}
    className={`h-7 w-7 flex items-center justify-center rounded transition-colors text-sm
      ${active
        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#12151A] hover:text-gray-900 dark:hover:text-gray-100"
      }
      ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-5 bg-gray-200 dark:bg-[#12151A] mx-0.5 flex-shrink-0" />
);

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Scrivi qui la descrizione del birrificio…",
  maxChars = 5000,
  className = "",
  enableMentions = false,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  // ── Mention suggestion state (only used when enableMentions=true) ──────────
  const [suggestionState, setSuggestionState] = useState<SuggestionPopupState>(null);
  // Stable ref so the Mention extension config (created once) can read the latest setter
  const setSuggestionRef = useRef(setSuggestionState);
  setSuggestionRef.current = setSuggestionState;
  // Key handler registered by the popup component
  const keyHandlerRef = useRef<((e: KeyboardEvent) => boolean) | null>(null);

  // Build the Mention extension only when enableMentions is true
  const mentionExtension = enableMentions
    ? Mention.extend({
        // Render mention nodes as anchor links so the stored HTML is already
        // a clickable <a href="/user/:label"> tag — no post-processing needed.
        renderHTML({ node }) {
          const label = (node.attrs.label as string) ?? "";
          return [
            "a",
            {
              href: `/user/${encodeURIComponent(label)}`,
              class: "mention text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer",
              "data-type": "mention",
              "data-id": String(node.attrs.id ?? ""),
              "data-label": label,
            },
            `@${label}`,
          ];
        },
      }).configure({
        HTMLAttributes: {},
        suggestion: {
          items: async ({ query }: { query: string }) => fetchMentionItems(query),
          render: () => {
            return {
              onStart(props: any) {
                setSuggestionRef.current({
                  items: (props.items as MentionItem[]) ?? [],
                  selectedIndex: 0,
                  rect: props.clientRect?.() ?? null,
                  command: (item: MentionItem) => props.command({ id: item.id, label: item.label }),
                });
              },
              onUpdate(props: any) {
                setSuggestionRef.current(prev => prev ? {
                  ...prev,
                  items: (props.items as MentionItem[]) ?? [],
                  rect: props.clientRect?.() ?? null,
                  command: (item: MentionItem) => props.command({ id: item.id, label: item.label }),
                } : null);
              },
              onExit() {
                setSuggestionRef.current(null);
              },
              onKeyDown({ event }: { event: KeyboardEvent }) {
                if (keyHandlerRef.current) {
                  return keyHandlerRef.current(event);
                }
                return false;
              },
            };
          },
        },
      })
    : null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-amber-600 dark:text-amber-400 underline hover:text-amber-700",
        },
      }),
      Color,
      TextStyle,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxChars }),
      Highlight.configure({ multicolor: true }),
      ...(mentionExtension ? [mentionExtension] : []),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4 text-gray-800 dark:text-gray-200",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content]);

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor?.chain().focus().setLink({ href: url }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  // Handler when user taps/clicks a suggestion item
  const handleSelectSuggestion = useCallback((item: MentionItem) => {
    if (suggestionState?.command) {
      suggestionState.command(item);
    }
    setSuggestionState(null);
  }, [suggestionState]);

  if (!editor) return null;

  const chars = editor.storage.characterCount.characters();

  return (
    <div className={`border border-gray-200 dark:border-[#23262E] rounded-xl overflow-hidden bg-white dark:bg-[#0B0D10] ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 dark:border-[#23262E] bg-gray-50 dark:bg-[#1A1D24]/50">

        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annulla">
          <Undo className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ripeti">
          <Redo className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titolo 1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titolo 2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titolo 3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragrafo">
          <Type className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Grassetto (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Corsivo (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sottolineato (Ctrl+U)">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barrato">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} active={editor.isActive("highlight")} title="Evidenzia">
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Allinea a sinistra">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centra">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Allinea a destra">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Giustifica">
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Elenco puntato">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Elenco numerato">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citazione">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linea separatrice">
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Link */}
        <ToolbarButton
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              setLinkUrl(editor.getAttributes("link").href || "");
              setShowLinkInput(v => !v);
            }
          }}
          active={editor.isActive("link")}
          title="Inserisci link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Link input row */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <LinkIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <Input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setLink(); if (e.key === "Escape") setShowLinkInput(false); }}
            placeholder="https://..."
            className="h-7 text-xs flex-1 border-amber-200 focus:border-amber-400"
            autoFocus
          />
          <Button size="sm" className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-400 text-white" onClick={setLink}>
            Applica
          </Button>
          <button type="button" onClick={() => setShowLinkInput(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Footer: char count */}
      <div className="flex items-center justify-end px-4 py-2 border-t border-gray-100 dark:border-[#23262E] bg-gray-50/50 dark:bg-[#1A1D24]/30">
        <span className={`text-[10px] font-medium tabular-nums ${chars > maxChars * 0.9 ? "text-amber-500" : "text-gray-400 dark:text-gray-600"}`}>
          {chars} / {maxChars.toLocaleString()} caratteri
        </span>
      </div>

      {/* Floating mention suggestion popup (portal to document.body) */}
      {enableMentions && (
        <MentionSuggestionList
          state={suggestionState}
          onSelect={handleSelectSuggestion}
          keyHandlerRef={keyHandlerRef}
        />
      )}
    </div>
  );
}

/**
 * Detects HTML content vs plain text. Plain-text legacy values (with \n)
 * get converted to HTML paragraphs/<br> so they render correctly inside the
 * rich text display (which uses dangerouslySetInnerHTML).
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "mark",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr",
    "a", "img", "span", "div",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "style", "data-type", "data-id", "data-label"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/(?:png|jpeg|gif|webp|svg\+xml);)/i,
  ALLOW_DATA_ATTR: false,
};

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Detects HTML content vs plain text. Plain-text legacy values (with \n)
 * get converted to HTML paragraphs/<br> so they render correctly inside the
 * rich text display. Output is always sanitized.
 */
export function normalizeRichContent(input: string | null | undefined): string {
  if (!input) return "";
  const s = String(input);
  // Heuristic: starts with a known block tag → treat as already HTML
  const looksLikeHtml = /^\s*<(p|h[1-6]|ul|ol|blockquote|div|hr|br|img|span|strong|em|a)\b/i.test(s);
  if (looksLikeHtml) return sanitizeRichHtml(s);
  const escapeHtml = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // Split on blank lines → paragraphs. Single \n inside a paragraph → <br>.
  const paragraphs = s.split(/\n\s*\n/);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * Strips HTML to plain text for short previews (cards, list items with
 * line-clamp). Collapses whitespace and adds a single space between blocks.
 */
export function richTextToPlain(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/<\s*(br|p|div|li|h[1-6]|blockquote|hr)[^>]*>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if a value coming from the editor / DB is effectively empty. */
export function isRichContentEmpty(input: string | null | undefined): boolean {
  if (!input) return true;
  const s = String(input).trim();
  if (!s) return true;
  // Strip tags & nbsp to see if there's any real text or media
  const stripped = s
    .replace(/<br\s*\/?>(\s|&nbsp;)*/gi, "")
    .replace(/<p>(\s|&nbsp;)*<\/p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, "")
    .trim();
  if (stripped) return false;
  // No text, but maybe contains an image
  return !/<img\b/i.test(s);
}

/** Renders sanitized HTML from the rich text editor safely. Accepts legacy plain text. */
export function RichTextDisplay({ html, className = "" }: { html: string; className?: string }) {
  if (isRichContentEmpty(html)) return null;
  const normalized = normalizeRichContent(html);
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
        prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-gray-800 dark:prose-strong:text-gray-100
        prose-ul:text-gray-600 dark:prose-ul:text-gray-300
        prose-ol:text-gray-600 dark:prose-ol:text-gray-300
        prose-blockquote:border-l-amber-400 prose-blockquote:text-gray-500 dark:prose-blockquote:text-gray-400
        prose-hr:border-gray-200 dark:prose-hr:border-gray-700
        ${className}`}
      dangerouslySetInnerHTML={{ __html: normalized }}
    />
  );
}
