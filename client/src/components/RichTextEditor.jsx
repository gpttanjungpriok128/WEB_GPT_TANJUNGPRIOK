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
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2 dark:border-slate-700">
        {commands.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => runCommand(item.command, item.value)}
            className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-56 p-3 outline-none"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}

export default RichTextEditor;
