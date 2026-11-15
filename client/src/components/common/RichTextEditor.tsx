import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Розширений текстовий редактор (Tiptap 3, рівень 2).
// Важкий компонент - підключається через React.lazy з ProductForm,
// тому потрапляє в окремий chunk і не збільшує початкове завантаження.
// HTML-вихід зберігається в description товару; Tiptap за схемою
// не пропускає довільні скрипти, тому HTML безпечний для відображення.
export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    immediatelyRender: false, // SSR-безпека і коректна робота в StrictMode
    editorProps: {
      attributes: {
        class:
          'prose-sm min-h-32 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_em]:italic [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Синхронізація зовнішніх значень (reset форми при редагуванні)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  const btnClass = (active: boolean) =>
    `rounded px-2 py-1 text-sm ${active ? 'bg-primary-100 text-primary-700 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`;

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1" role="toolbar" aria-label="Форматування тексту">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor?.can().toggleBold()}
          className={btnClass(editor?.isActive('bold') ?? false)}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor?.can().toggleItalic()}
          className={btnClass(editor?.isActive('italic') ?? false)}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={btnClass(editor?.isActive('bulletList') ?? false)}
        >
          • Список
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor?.isActive('orderedList') ?? false)}
        >
          1. Список
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Очистити
        </button>
      </div>
      <EditorContent editor={editor} />
      {placeholder && !editor?.getText() && (
        <p className="text-xs text-gray-400">{placeholder}</p>
      )}
    </div>
  );
}
