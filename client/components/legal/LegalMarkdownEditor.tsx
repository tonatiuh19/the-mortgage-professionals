import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Braces,
  Code2,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
} from "lucide-react";
import { LEGAL_PLACEHOLDERS, type LegalPlaceholder } from "@shared/legal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LegalMarkdown } from "@/components/LegalMarkdown";

// ── {{placeholder}} chips ────────────────────────────────────────────────────
// Decorations only: the text stays "{{phone}}" in the document and Markdown.
const FIELD_RE = /\{\{\s*[a-z0-9_]+\s*\}\}/g;
const PlaceholderChips = Extension.create({
  name: "legalPlaceholderChips",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("legalPlaceholderChips"),
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const m of node.text.matchAll(FIELD_RE)) {
                const from = pos + (m.index ?? 0);
                decos.push(Decoration.inline(from, from + m[0].length, { class: "legal-field-chip" }));
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

const getMarkdown = (editor: Editor): string =>
  ((editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown() ?? "").trim() + "\n";

// ── Slash menu ───────────────────────────────────────────────────────────────
interface SlashItem {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: (e: Editor) => void;
}

const BLOCK_ITEMS: SlashItem[] = [
  { id: "h2", label: "Section heading", hint: "## 1. Title", icon: <Heading2 className="h-4 w-4" />, run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "h3", label: "Sub-heading", hint: "### Title", icon: <Heading3 className="h-4 w-4" />, run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "ul", label: "Bullet list", hint: "- item", icon: <List className="h-4 w-4" />, run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "ol", label: "Numbered list", hint: "1. item", icon: <ListOrdered className="h-4 w-4" />, run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "quote", label: "Callout / quote", hint: "> text", icon: <Quote className="h-4 w-4" />, run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "hr", label: "Divider", hint: "---", icon: <Minus className="h-4 w-4" />, run: (e) => e.chain().focus().setHorizontalRule().run() },
];

const fieldItems = (): SlashItem[] =>
  LEGAL_PLACEHOLDERS.map((p) => ({
    id: `field-${p.key}`,
    label: p.label,
    hint: `{{${p.key}}}`,
    icon: <Braces className="h-4 w-4" />,
    run: (e) => e.chain().focus().insertContent(`{{${p.key}}}`).run(),
  }));

type Mode = "write" | "markdown" | "preview";

export interface LegalMarkdownEditorProps {
  /** Initial Markdown. Changing `resetKey` reloads it into the editor. */
  value: string;
  resetKey: string;
  onChange: (markdown: string) => void;
  /** Markdown with placeholders filled, for the Preview tab. */
  renderPreview: (markdown: string) => string;
  readOnly?: boolean;
}

/**
 * Visual editor that stores Markdown (Tiptap + tiptap-markdown). Write mode hides
 * the syntax, Markdown mode edits the raw source, Preview shows the public page.
 */
export default function LegalMarkdownEditor({ value, resetKey, onChange, renderPreview, readOnly }: LegalMarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>("write");
  const [source, setSource] = useState(value);
  const [slash, setSlash] = useState<{ query: string; top: number; left: number; index: number } | null>(null);
  const slashRef = useRef(slash);
  slashRef.current = slash;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => [...BLOCK_ITEMS, ...fieldItems()], []);
  const filtered = useMemo(() => {
    const q = slash?.query.toLowerCase() ?? "";
    return allItems.filter((i) => !q || i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)).slice(0, 9);
  }, [allItems, slash?.query]);
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  const editor = useEditor({
    editable: !readOnly,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true, protocols: ["mailto", "tel"] },
      }),
      Placeholder.configure({ placeholder: "Start writing… type “/” for headings, lists and company fields" }),
      Markdown.configure({ html: false, breaks: true, linkify: true, transformPastedText: true, tightLists: true }),
      PlaceholderChips,
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[420px] px-5 py-4 focus:outline-none prose-h2:border-b prose-h2:pb-1 prose-a:text-primary",
      },
      handleKeyDown: (_view, event) => {
        const s = slashRef.current;
        if (!s) return false;
        const items = filteredRef.current;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setSlash({ ...s, index: (s.index + delta + items.length) % Math.max(items.length, 1) });
          return true;
        }
        if (event.key === "Enter" && items[s.index]) {
          runSlashRef.current(items[s.index]);
          return true;
        }
        if (event.key === "Escape") {
          setSlash(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChangeRef.current(getMarkdown(e));
      updateSlash(e);
    },
    onSelectionUpdate: ({ editor: e }) => updateSlash(e),
  });

  /** Opens the menu while the text before the cursor is "/query" at a word start. */
  const updateSlash = useCallback((e: Editor) => {
    const { from, empty } = e.state.selection;
    if (!empty) return setSlash(null);
    const $from = e.state.selection.$from;
    const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
    const m = /(?:^|\s)\/([a-z0-9 ]{0,24})$/i.exec(before);
    if (!m || !wrapperRef.current) return setSlash(null);
    const coords = e.view.coordsAtPos(from);
    const box = wrapperRef.current.getBoundingClientRect();
    setSlash((prev) => ({
      query: m[1],
      top: coords.bottom - box.top + 6,
      left: Math.min(coords.left - box.left, box.width - 280),
      index: prev && prev.query === m[1] ? prev.index : 0,
    }));
  }, []);

  const runSlash = useCallback(
    (item: SlashItem) => {
      if (!editor || !slashRef.current) return;
      const { from } = editor.state.selection;
      const len = slashRef.current.query.length + 1; // "/" + query
      editor.chain().focus().deleteRange({ from: from - len, to: from }).run();
      item.run(editor);
      setSlash(null);
    },
    [editor],
  );

  const runSlashRef = useRef(runSlash);
  runSlashRef.current = runSlash;

  // Reload when the caller switches document / restores a version / discards.
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(value, { emitUpdate: false });
    setSource(value);
    setMode("write");
    setSlash(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, resetKey]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const switchMode = (next: Mode) => {
    if (!editor || next === mode) return;
    if (mode === "markdown") {
      editor.commands.setContent(source, { emitUpdate: false });
    } else if (next === "markdown") {
      setSource(getMarkdown(editor));
    }
    setSlash(null);
    setMode(next);
  };

  const setLink = () => {
    if (!editor) return;
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "https://";
    const url = window.prompt("Link address (https://…, mailto:…, tel:…)", prev);
    if (url === null) return;
    if (!url.trim()) return void editor.chain().focus().extendMarkRange("link").unsetLink().run();
    if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(url.trim())) return window.alert("Links must start with https://, mailto:, tel: or /");
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const currentMarkdown = mode === "markdown" ? source : editor ? getMarkdown(editor) : value;

  const tb = (active: boolean) =>
    cn("h-8 w-8 p-0", active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary");

  return (
    <div ref={wrapperRef} className="relative overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* Mode tabs + toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5 backdrop-blur">
        <div className="mr-2 inline-flex rounded-lg bg-background p-0.5 shadow-sm">
          {([
            ["write", "Write", <PenLine key="w" className="h-3.5 w-3.5" />],
            ["markdown", "Markdown", <Code2 key="m" className="h-3.5 w-3.5" />],
            ["preview", "Preview", <Eye key="p" className="h-3.5 w-3.5" />],
          ] as const).map(([m, label, icon]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                mode === m ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {mode === "write" && editor && !readOnly && (
          <>
            <Button type="button" variant="ghost" className={tb(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Section heading">
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className={tb(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Sub-heading">
              <Heading3 className="h-4 w-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button type="button" variant="ghost" className={tb(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
              <Bold className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className={tb(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className={tb(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className={tb(editor.isActive("link"))} onClick={setLink} title="Link">
              <Link2 className="h-4 w-4" />
            </Button>
            {editor.isActive("link") && (
              <Button type="button" variant="ghost" className={tb(false)} onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
                <Unlink className="h-4 w-4" />
              </Button>
            )}
            <span className="mx-1 h-5 w-px bg-border" />
            <Button type="button" variant="ghost" className={tb(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
              <List className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className={tb(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" className={tb(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Callout">
              <Quote className="h-4 w-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
                  <Braces className="h-4 w-4" /> Insert field
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs">Filled from Company details</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LEGAL_PLACEHOLDERS.map((p) => (
                  <DropdownMenuItem
                    key={p.key}
                    onSelect={() => editor.chain().focus().insertContent(`{{${p.key as LegalPlaceholder}}}`).run()}
                    className="flex justify-between gap-2"
                  >
                    <span>{p.label}</span>
                    <code className="text-[10px] text-muted-foreground">{`{{${p.key}}}`}</code>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex">
              <Button type="button" variant="ghost" className={tb(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (⌘Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" className={tb(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (⇧⌘Z)">
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
        {mode === "markdown" && (
          <span className="text-xs text-muted-foreground">Raw Markdown — headings ##, **bold**, - lists, {"{{fields}}"}</span>
        )}
        {mode === "preview" && <span className="text-xs text-muted-foreground">Exactly what visitors will see</span>}
      </div>

      {/* Bodies */}
      <div className={cn(mode !== "write" && "hidden")}>
        <EditorContent editor={editor} />
      </div>
      {mode === "markdown" && (
        <Textarea
          value={source}
          readOnly={readOnly}
          onChange={(e) => {
            setSource(e.target.value);
            onChange(e.target.value);
          }}
          spellCheck
          className="min-h-[420px] resize-y rounded-none border-0 font-mono text-[13px] leading-relaxed focus-visible:ring-0"
        />
      )}
      {mode === "preview" && (
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <LegalMarkdown markdown={renderPreview(currentMarkdown)} />
        </div>
      )}

      {/* Slash menu */}
      {slash && mode === "write" && filtered.length > 0 && (
        <div
          className="absolute z-20 w-72 overflow-hidden rounded-xl border bg-popover p-1 shadow-xl animate-in fade-in zoom-in-95"
          style={{ top: slash.top, left: Math.max(slash.left, 8) }}
          role="listbox"
        >
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={i === slash.index}
              onMouseDown={(e) => {
                e.preventDefault();
                runSlash(item);
              }}
              onMouseEnter={() => setSlash({ ...slash, index: i })}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm",
                i === slash.index ? "bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-background">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <code className="text-[10px] text-muted-foreground">{item.hint}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
