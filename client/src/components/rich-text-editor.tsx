import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
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
import { useEffect, useCallback, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Link as LinkIcon,
  Highlighter, Heading1, Heading2, Heading3,
  Undo, Redo, Type, Image as ImageIcon, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxChars?: number;
  className?: string;
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
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
      }
      ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />
);

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Scrivi qui la descrizione del birrificio…",
  maxChars = 5000,
  className = "",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

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
      editor.commands.setContent(content, false);
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

  if (!editor) return null;

  const chars = editor.storage.characterCount.characters();

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">

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
      <div className="flex items-center justify-end px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <span className={`text-[10px] font-medium tabular-nums ${chars > maxChars * 0.9 ? "text-amber-500" : "text-gray-400 dark:text-gray-600"}`}>
          {chars} / {maxChars.toLocaleString()} caratteri
        </span>
      </div>
    </div>
  );
}

/** Renders sanitized HTML from the rich text editor safely */
export function RichTextDisplay({ html, className = "" }: { html: string; className?: string }) {
  if (!html || html === "<p></p>") return null;
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
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
