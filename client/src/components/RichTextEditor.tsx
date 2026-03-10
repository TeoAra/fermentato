import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ImageIcon, Heading1, Heading2, Heading3,
  Minus, Undo, Redo
} from "lucide-react";

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
];

export function RichTextEditor({ value, onChange, placeholder = "Scrivi il contenuto...", className = "" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-amber-600 underline" } }),
      Image.configure({ inline: false, HTMLAttributes: { class: "max-w-full rounded-lg my-4" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const colorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors text-sm ${active ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
    >
      {children}
    </button>
  );

  const addImage = () => {
    const url = prompt("URL immagine:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = prompt("URL link:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
  };

  return (
    <div className={`border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        {/* History */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Annulla"><Undo className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Ripeti"><Redo className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />

        {/* Headings */}
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titolo 1"><Heading1 className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titolo 2"><Heading2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titolo 3"><Heading3 className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />

        {/* Text format */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Grassetto"><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Corsivo"><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sottolineato"><UnderlineIcon className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barrato"><Strikethrough className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />

        {/* Color */}
        <div className="relative" title="Colore testo">
          <input
            ref={colorRef}
            type="color"
            className="absolute inset-0 opacity-0 w-7 h-7 cursor-pointer"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
          <div className="w-7 h-7 rounded border border-gray-200 dark:border-slate-600 flex items-center justify-center cursor-pointer" onClick={() => colorRef.current?.click()}>
            <span className="text-xs font-bold" style={{ color: editor.getAttributes("textStyle").color || "#000" }}>A</span>
          </div>
        </div>

        {/* Font family */}
        <select
          className="text-xs border border-gray-200 dark:border-slate-600 rounded px-1 py-0.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 ml-0.5"
          title="Font"
          onChange={(e) => e.target.value ? editor.chain().focus().setFontFamily(e.target.value).run() : editor.chain().focus().unsetFontFamily().run()}
        >
          {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Allinea sinistra"><AlignLeft className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centra"><AlignCenter className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Allinea destra"><AlignRight className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Giustificato"><AlignJustify className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Elenco puntato"><List className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Elenco numerato"><ListOrdered className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separatore"><Minus className="h-4 w-4" /></ToolBtn>
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />

        {/* Link & Image */}
        <ToolBtn onClick={addLink} active={editor.isActive("link")} title="Inserisci link"><LinkIcon className="h-4 w-4" /></ToolBtn>
        <ToolBtn onClick={addImage} title="Inserisci immagine"><ImageIcon className="h-4 w-4" /></ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-[320px] max-h-[600px] overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none bg-white dark:bg-slate-900 focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
      />
    </div>
  );
}
