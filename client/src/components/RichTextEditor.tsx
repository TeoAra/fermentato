import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ImageIcon, Heading1, Heading2, Heading3,
  Minus, Undo, Redo, Table as TableIcon, Subscript as SubIcon,
  Superscript as SupIcon, Highlighter, Maximize2, Minimize2,
  Code, Quote, RemoveFormatting
} from "lucide-react";

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize?.replace("px", "") || null,
          renderHTML: (attrs: any) => attrs.fontSize ? { style: `font-size:${attrs.fontSize}px` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const FONTS = [
  { label: "Predefinito", value: "" },
  { label: "Sans-serif", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, Cambria, serif" },
  { label: "Monospace", value: "ui-monospace, monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

const FONT_SIZES = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48"];

const HIGHLIGHT_COLORS = [
  { color: "#fef08a", label: "Giallo" },
  { color: "#bbf7d0", label: "Verde" },
  { color: "#bfdbfe", label: "Blu" },
  { color: "#fecaca", label: "Rosso" },
  { color: "#e9d5ff", label: "Viola" },
  { color: "#fed7aa", label: "Arancio" },
  { color: "#f0fdf4", label: "Verde chiaro" },
];

export function RichTextEditor({ value, onChange, placeholder = "Scrivi il contenuto...", className = "" }: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const colorRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-amber-600 underline cursor-pointer" } }),
      Image.configure({ inline: false, HTMLAttributes: { class: "max-w-full rounded-lg my-4" } }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  if (!editor) return null;

  const charCount = (editor.storage.characterCount as any)?.characters() ?? 0;
  const wordCount = (editor.storage.characterCount as any)?.words() ?? 0;

  const Btn = ({ onClick, active, title, children }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${active
        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600"
      }`}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-gray-300 dark:bg-neutral-600 mx-0.5 self-center shrink-0" />;

  const addImage = () => {
    const url = prompt("URL immagine:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = prompt("URL link:", prev);
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
  };

  const containerCls = isFullscreen
    ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-900 shadow-2xl"
    : `border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden ${className}`;

  return (
    <div className={containerCls}>
      {/* ── TOOLBAR ── */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 select-none"
        onClick={() => { setShowHighlightPicker(false); setShowTablePicker(false); }}
      >
        {/* History */}
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Annulla"><Undo className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Ripeti"><Redo className="h-4 w-4" /></Btn>
        <Sep />

        {/* Headings */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titolo 1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titolo 2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titolo 3"><Heading3 className="h-4 w-4" /></Btn>
        <Sep />

        {/* Formatting */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Grassetto"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Corsivo"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sottolineato"><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barrato"><Strikethrough className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Codice"><Code className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Pedice"><SubIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Apice"><SupIcon className="h-4 w-4" /></Btn>
        <Sep />

        {/* Text color */}
        <div className="relative" title="Colore testo">
          <input
            ref={colorRef}
            type="color"
            className="absolute inset-0 opacity-0 w-7 h-7 cursor-pointer"
            defaultValue="#000000"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
          <div
            className="w-7 h-7 rounded border border-gray-300 dark:border-neutral-500 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); colorRef.current?.click(); }}
          >
            <span className="text-xs font-bold" style={{ color: editor.getAttributes("textStyle").color || "currentColor" }}>A</span>
          </div>
        </div>

        {/* Highlight */}
        <div className="relative">
          <Btn
            onClick={(e: any) => { e.stopPropagation(); setShowHighlightPicker(p => !p); setShowTablePicker(false); }}
            active={editor.isActive("highlight")}
            title="Colore sfondo"
          >
            <Highlighter className="h-4 w-4" />
          </Btn>
          {showHighlightPicker && (
            <div
              className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg p-2 shadow-xl flex gap-1.5 items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {HIGHLIGHT_COLORS.map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  title={label}
                  onClick={() => { editor.chain().focus().setHighlight({ color }).run(); setShowHighlightPicker(false); }}
                  className="w-6 h-6 rounded border-2 border-transparent hover:border-gray-400 transition-all hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                type="button"
                title="Rimuovi sfondo"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
                className="w-6 h-6 rounded border border-gray-300 dark:border-neutral-500 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400 text-xs flex items-center justify-center"
              >✕</button>
            </div>
          )}
        </div>
        <Sep />

        {/* Font family */}
        <select
          className="text-xs border border-gray-300 dark:border-neutral-600 rounded px-1 py-1 bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-300 max-w-[88px]"
          title="Carattere"
          onChange={(e) => e.target.value
            ? editor.chain().focus().setFontFamily(e.target.value).run()
            : editor.chain().focus().unsetFontFamily().run()
          }
        >
          {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Font size */}
        <select
          className="text-xs border border-gray-300 dark:border-neutral-600 rounded px-1 py-1 bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-300 w-16"
          title="Dimensione"
          defaultValue=""
          onChange={(e) => e.target.value
            ? (editor.commands as any).setFontSize(e.target.value)
            : (editor.commands as any).unsetFontSize()
          }
        >
          <option value="">Auto</option>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <Sep />

        {/* Alignment */}
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Allinea sinistra"><AlignLeft className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centra"><AlignCenter className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Allinea destra"><AlignRight className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Giustificato"><AlignJustify className="h-4 w-4" /></Btn>
        <Sep />

        {/* Lists & blocks */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Elenco puntato"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Elenco numerato"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citazione"><Quote className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separatore orizzontale"><Minus className="h-4 w-4" /></Btn>
        <Sep />

        {/* Table */}
        <div className="relative">
          <Btn
            onClick={(e: any) => { e.stopPropagation(); setShowTablePicker(p => !p); setShowHighlightPicker(false); }}
            active={editor.isActive("table")}
            title="Tabella"
          >
            <TableIcon className="h-4 w-4" />
          </Btn>
          {showTablePicker && (
            <div
              className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-xl p-3 shadow-xl min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {hoveredCell ? `Tabella ${hoveredCell.r} × ${hoveredCell.c}` : "Seleziona dimensione"}
              </p>
              <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {Array.from({ length: 36 }, (_, i) => {
                  const r = Math.floor(i / 6) + 1;
                  const c = (i % 6) + 1;
                  const isHovered = hoveredCell && r <= hoveredCell.r && c <= hoveredCell.c;
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHoveredCell({ r, c })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => { editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); setShowTablePicker(false); }}
                      className={`w-6 h-6 border rounded transition-colors ${isHovered ? "bg-amber-200 border-amber-400 dark:bg-amber-800 dark:border-amber-500" : "border-gray-200 dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-700"}`}
                    />
                  );
                })}
              </div>
              {editor.isActive("table") && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-neutral-600 grid grid-cols-2 gap-1">
                  {[
                    { label: "+ Col. sinistra", fn: () => editor.chain().focus().addColumnBefore().run() },
                    { label: "+ Col. destra", fn: () => editor.chain().focus().addColumnAfter().run() },
                    { label: "+ Riga sopra", fn: () => editor.chain().focus().addRowBefore().run() },
                    { label: "+ Riga sotto", fn: () => editor.chain().focus().addRowAfter().run() },
                  ].map(({ label, fn }) => (
                    <button key={label} type="button" onClick={fn} className="text-xs px-2 py-1 bg-gray-50 dark:bg-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-600 rounded text-left">
                      {label}
                    </button>
                  ))}
                  <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="col-span-2 text-xs px-2 py-1 text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-left">
                    🗑 Elimina tabella
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Link & Image */}
        <Btn onClick={addLink} active={editor.isActive("link")} title="Link"><LinkIcon className="h-4 w-4" /></Btn>
        <Btn onClick={addImage} title="Immagine"><ImageIcon className="h-4 w-4" /></Btn>
        <Sep />

        {/* Clear format */}
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Rimuovi formattazione">
          <RemoveFormatting className="h-4 w-4" />
        </Btn>

        {/* Fullscreen — pushed to the right */}
        <div className="ml-auto">
          <Btn onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? "Esci da schermo intero" : "Schermo intero"}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Btn>
        </div>
      </div>

      {/* ── EDITOR AREA ── */}
      <EditorContent
        editor={editor}
        className={`
          prose prose-sm dark:prose-invert max-w-none p-6 bg-white dark:bg-neutral-900 overflow-auto
          focus-within:outline-none
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:min-h-[300px]
          [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-4
          [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:dark:border-neutral-600 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-50 [&_.ProseMirror_th]:dark:bg-neutral-800 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_th]:text-left
          [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:dark:border-neutral-600 [&_.ProseMirror_td]:p-2
          [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-amber-400 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-gray-600 [&_.ProseMirror_blockquote]:dark:text-gray-400
          [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0
          ${isFullscreen ? "flex-1 min-h-0 h-[calc(100dvh-100px)]" : "min-h-[340px] max-h-[640px]"}
        `}
      />

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 text-xs text-gray-400">
        <span>{wordCount} {wordCount === 1 ? "parola" : "parole"} · {charCount} caratteri</span>
        {isFullscreen && (
          <button type="button" onClick={() => setIsFullscreen(false)} className="text-amber-600 hover:underline text-xs">
            Esci da schermo intero (Esc)
          </button>
        )}
      </div>
    </div>
  );
}
