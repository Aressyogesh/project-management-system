import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { uploadsApi } from '../../api/uploadsApi';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

// ── Toolbar icon button ────────────────────────────────────────────────────────
function Btn({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      className={`flex items-center justify-center w-7 h-7 rounded text-[13px] transition-colors ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Bold: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M6 4h8a4 4 0 010 8H6V4zm0 8h9a4 4 0 010 8H6v-8z" />
    </svg>
  ),
  Italic: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M10 4h4l-4 16H6l4-16zm4 0h4v2h-4V4zM6 18h4v2H6v-2z" />
    </svg>
  ),
  Underline: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 17a6 6 0 006-6V3h-2v8a4 4 0 01-8 0V3H6v8a6 6 0 006 6zm-7 2h14v2H5v-2z" />
    </svg>
  ),
  Strike: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M3 11h18v2H3v-2zm7-8h4a4 4 0 014 4H6a4 4 0 014-4zm-4 9h10a4 4 0 01-4 4h-2a4 4 0 01-4-4z" />
    </svg>
  ),
  H1: () => <span className="font-bold text-[11px] leading-none">H1</span>,
  H2: () => <span className="font-bold text-[11px] leading-none">H2</span>,
  H3: () => <span className="font-bold text-[11px] leading-none">H3</span>,
  BulletList: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M4 6a1 1 0 110-2 1 1 0 010 2zm3-1h13v2H7V5zm-3 6a1 1 0 110-2 1 1 0 010 2zm3-1h13v2H7v-2zm-3 6a1 1 0 110-2 1 1 0 010 2zm3-1h13v2H7v-2z" />
    </svg>
  ),
  OrderedList: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M2.5 4h1V6h-.5v.5h.5V7H2v-.5h.5V5H2V4zM7 5h13v2H7V5zm-4.5 6H4V9H2.5v1h1v.5h-1V11H2v1h2.5v-1zm0 5H2v-1h2v-.5H2v-1h2.5V16H4v.5h.5V17H2v1h2.5v-1zM7 11h13v2H7v-2zm0 6h13v2H7v-2z" />
    </svg>
  ),
  Blockquote: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M4 6h6l-2 4H6l1-2H4V6zm8 0h6l-2 4h-2l1-2h-3V6zM4 14h4v4H4v-4zm8 0h4v4h-4v-4z" />
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  CodeBlock: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <polyline points="8 10 5 13 8 16" />
      <polyline points="16 10 19 13 16 16" />
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  ColorA: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M12 3L4 21h2.5l1.75-4.5h7.5L17.5 21H20L12 3zm-2.75 11L12 7.5l2.75 6.5h-5.5z" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  ),
  Clear: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
    </svg>
  ),
};

const Divider = () => <div className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />;

const COLORS = [
  { hex: '#1a1a1a', label: 'Black' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#ec4899', label: 'Pink' },
];

// ── Main component ─────────────────────────────────────────────────────────────
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add a description…',
  minHeight = '140px',
  readOnly = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value]);

  if (!editor) return null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { url } = await uploadsApi.uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      // silently fail — image just won't be inserted
    } finally {
      setUploading(false);
    }
  }

  function handleLinkInsert() {
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-visible focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent bg-white"
      onClick={() => setShowColorPicker(false)}
    >
      {/* Hidden image file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {!readOnly && (
        <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 rounded-t-lg">

          {/* Text formatting */}
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Icons.Bold />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Icons.Italic />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
            <Icons.Underline />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Icons.Strike />
          </Btn>

          <Divider />

          {/* Headings */}
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Icons.H1 />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Icons.H2 />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Icons.H3 />
          </Btn>

          <Divider />

          {/* Lists */}
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <Icons.BulletList />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <Icons.OrderedList />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Icons.Blockquote />
          </Btn>

          <Divider />

          {/* Insert */}
          <Btn onClick={handleLinkInsert} active={editor.isActive('link')} title="Insert / edit link">
            <Icons.Link />
          </Btn>
          <Btn onClick={() => fileInputRef.current?.click()} title="Insert image" disabled={uploading}>
            <Icons.Image />
          </Btn>

          <Divider />

          {/* Code */}
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
            <Icons.Code />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
            <Icons.CodeBlock />
          </Btn>

          <Divider />

          {/* Text color */}
          <div className="relative">
            <Btn
              onClick={(e?: unknown) => { (e as React.MouseEvent)?.stopPropagation?.(); setShowColorPicker((v) => !v); }}
              title="Text color"
            >
              <Icons.ColorA />
            </Btn>
            {showColorPicker && (
              <div
                className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setColor(c.hex).run();
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <button
                  type="button"
                  title="Reset color"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().unsetColor().run();
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded border border-gray-300 bg-white text-[9px] font-medium text-gray-500 hover:scale-110 transition-transform leading-none"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <Divider />

          {/* Undo / Redo */}
          <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}>
            <Icons.Undo />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)" disabled={!editor.can().redo()}>
            <Icons.Redo />
          </Btn>

          <Divider />

          {/* Clear formatting */}
          <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear all formatting">
            <Icons.Clear />
          </Btn>

          {uploading && (
            <span className="ml-auto text-[11px] text-gray-400 italic pr-1">Uploading…</span>
          )}
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 text-sm text-gray-800 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[var(--editor-min-h)]"
        style={{ '--editor-min-h': minHeight } as React.CSSProperties}
      />
    </div>
  );
}
