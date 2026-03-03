import { useEffect, useRef } from 'react';

const commands = [
  { label: 'B', command: 'bold' },
  { label: 'I', command: 'italic' },
  { label: 'U', command: 'underline' },
  { label: 'H2', command: 'formatBlock', value: 'h2' },
  { label: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { label: 'UL', command: 'insertUnorderedList' }
];

function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command, commandValue) => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="editor-card overflow-hidden">
      <div className="editor-toolbar flex flex-wrap gap-2 p-2">
        {commands.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => runCommand(item.command, item.value)}
            className="rounded-xl border border-brand-200 bg-white/80 px-2.5 py-1 text-sm text-brand-700 transition-all hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-800/70"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-56 p-3 outline-none text-brand-800 dark:text-brand-200"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}

export default RichTextEditor;
