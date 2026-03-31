"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Extension } from "@tiptap/core";
import { useCallback, useRef, useEffect } from "react";

// ── Custom FontSize via global attributes on textStyle ───────────────────────
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontSize || null,
            renderHTML: (attrs: Record<string, unknown>) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

// ── Colors / sizes ────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#f2f0eb", "#00e5ff", "#6c63ff", "#00ff94",
  "#ff3d00", "#ffd600", "#ff00ff", "#4caf50",
  "#ffffff", "#888888", "#444444",
];

const HIGHLIGHT_COLORS = ["#ffd600", "#00e5ff", "#6c63ff", "#ff3d00", "#00ff94"];
const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px", "64px"];

// ── Reusable toolbar button ───────────────────────────────────────────────────
function ToolBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        padding: "4px 8px",
        borderRadius: 5,
        border: "none",
        background: active ? "rgba(108,99,255,0.35)" : "transparent",
        color: active ? "#6c63ff" : "#aaa",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        transition: "all 0.15s",
        lineHeight: 1,
        minWidth: 28,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span style={{
      width: 1, height: 20,
      background: "rgba(255,255,255,0.08)",
      display: "inline-block",
      margin: "0 4px",
      verticalAlign: "middle",
    }} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface RichEditorProps {
  content: string;
  onChange?: (json: string) => void;
  readOnly?: boolean;
}

export default function RichEditor({ content, onChange, readOnly = false }: RichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const parsedContent = (() => {
    if (!content) return "";
    try { return JSON.parse(content); }
    catch { return content; }
  })();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: readOnly, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: parsedContent || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    immediatelyRender: false,
  });

  // Sync editable state when readOnly prop changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Sync external content changes
  useEffect(() => {
    if (!editor) return;
    const incoming = (() => {
      if (!content) return null;
      try { return JSON.parse(content); }
      catch { return content; }
    })();
    if (incoming && JSON.stringify(editor.getJSON()) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const insertImage = useCallback(() => { imageInputRef.current?.click(); }, []);

  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("URL du lien :", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Toolbar ── */}
      {!readOnly && (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "none",
          borderRadius: "10px 10px 0 0",
          padding: "8px 10px",
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}>

          {/* History */}
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Annuler (Ctrl+Z)">↩</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Rétablir (Ctrl+Y)">↪</ToolBtn>
          <Sep />

          {/* Headings */}
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titre 1">H1</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titre 2">H2</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titre 3">H3</ToolBtn>
          <Sep />

          {/* Text formatting */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras"><b>G</b></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique"><i>I</i></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligné"><u>S</u></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barré"><s>B</s></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code inline">{"`c`"}</ToolBtn>
          <Sep />

          {/* Alignment */}
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Gauche">⬅</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrer">↔</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Droite">➡</ToolBtn>
          <Sep />

          {/* Lists & blocks */}
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste à puces">• —</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numérotée">1.</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citation">❝</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Bloc de code">{"</>"}</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">—</ToolBtn>
          <Sep />

          {/* Font size */}
          <select
            title="Taille de police"
            defaultValue=""
            onChange={(e) => {
              const size = e.target.value;
              if (size) {
                editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
              }
              e.target.value = "";
            }}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#aaa",
              borderRadius: 5,
              padding: "3px 6px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <option value="" disabled>Taille</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Sep />

          {/* Text color */}
          <span style={{ fontSize: 11, color: "#777", marginRight: 2 }}>A</span>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }}
                title={c}
                style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: c, border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                }}
              />
            ))}
            <input
              type="color"
              title="Couleur personnalisée"
              onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              style={{ width: 20, height: 20, padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: 3, flexShrink: 0 }}
            />
          </div>
          <Sep />

          {/* Highlight */}
          <span style={{ fontSize: 11, color: "#777", marginRight: 2 }}>HL</span>
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c }).run(); }}
                title={`Surligner ${c}`}
                style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: c, border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                }}
              />
            ))}
          </div>
          <Sep />

          {/* Image & link */}
          <ToolBtn onClick={insertImage} title="Insérer une image">🖼</ToolBtn>
          <ToolBtn onClick={addLink} active={editor.isActive("link")} title="Insérer/modifier un lien">🔗</ToolBtn>

          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
        </div>
      )}

      {/* ── Editor area ── */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: readOnly ? 10 : "0 0 10px 10px",
          background: readOnly ? "transparent" : "rgba(255,255,255,0.02)",
          minHeight: readOnly ? 0 : 300,
        }}
        className="tiptap-wrapper"
      >
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .tiptap-wrapper .ProseMirror {
          padding: ${readOnly ? "0" : "16px 20px"};
          outline: none;
          min-height: ${readOnly ? "0" : "280px"};
          color: var(--text, #f2f0eb);
          font-family: var(--font-body, system-ui, sans-serif);
          font-size: 15px;
          line-height: 1.75;
        }
        .tiptap-wrapper .ProseMirror h1 { font-size: 2rem; font-weight: 800; margin: 1.2em 0 0.4em; letter-spacing: -0.03em; }
        .tiptap-wrapper .ProseMirror h2 { font-size: 1.5rem; font-weight: 700; margin: 1em 0 0.3em; letter-spacing: -0.02em; }
        .tiptap-wrapper .ProseMirror h3 { font-size: 1.2rem; font-weight: 600; margin: 0.8em 0 0.25em; }
        .tiptap-wrapper .ProseMirror p { margin: 0.5em 0; }
        .tiptap-wrapper .ProseMirror ul,
        .tiptap-wrapper .ProseMirror ol { padding-left: 1.6em; margin: 0.5em 0; }
        .tiptap-wrapper .ProseMirror li { margin: 0.2em 0; }
        .tiptap-wrapper .ProseMirror blockquote {
          border-left: 3px solid rgba(108,99,255,0.5);
          padding-left: 1em;
          color: #999;
          margin: 0.8em 0;
          font-style: italic;
        }
        .tiptap-wrapper .ProseMirror code {
          background: rgba(0,229,255,0.08);
          color: #00e5ff;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
          font-size: 0.88em;
        }
        .tiptap-wrapper .ProseMirror pre {
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 1em 1.2em;
          overflow-x: auto;
          margin: 0.8em 0;
        }
        .tiptap-wrapper .ProseMirror pre code {
          background: none;
          color: #00e5ff;
          padding: 0;
          font-size: 0.9em;
        }
        .tiptap-wrapper .ProseMirror img {
          max-width: 100%;
          border-radius: 8px;
          margin: 0.8em 0;
          display: block;
        }
        .tiptap-wrapper .ProseMirror a {
          color: #6c63ff;
          text-decoration: underline;
        }
        .tiptap-wrapper .ProseMirror hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.1);
          margin: 1.5em 0;
        }
        .tiptap-wrapper .ProseMirror mark {
          border-radius: 3px;
          padding: 0 3px;
        }
        .tiptap-wrapper .ProseMirror > * + * { margin-top: 0.4em; }
      `}</style>
    </div>
  );
}
