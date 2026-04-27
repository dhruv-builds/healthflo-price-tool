// Lightweight rich-text editor based on Tiptap. Stores Tiptap JSON.
// Falls back gracefully — keeps the structured-doc contract intact.
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Heading2, Link as LinkIcon } from "lucide-react";
import { TiptapDoc, emptyTiptap } from "@/types/commercialDoc";

interface Props {
  value: TiptapDoc;
  onChange: (v: TiptapDoc) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value ?? emptyTiptap(),
    onUpdate: ({ editor }) => onChange(editor.getJSON() as TiptapDoc),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[80px] rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) editor.commands.setContent(value ?? emptyTiptap(), { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3 w-3" /></ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3 w-3" /></ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3 w-3" /></ToolBtn>
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3 w-3" /></ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3 w-3" /></ToolBtn>
        <ToolBtn
          active={editor.isActive("link")}
          onClick={() => {
            const url = prompt("URL", editor.getAttributes("link").href ?? "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
        ><LinkIcon className="h-3 w-3" /></ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" size="sm" variant={active ? "secondary" : "ghost"} className="h-7 w-7 p-0" onClick={onClick}>
      {children}
    </Button>
  );
}
