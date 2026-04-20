import { useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { MarkdownPreview } from './MarkdownPreview.jsx';

const TOOLBAR = [
  { label: 'B', title: 'Bold', wrap: '**' },
  { label: 'I', title: 'Italic', wrap: '*' },
  { label: 'H1', title: 'Heading 1', linePrefix: '# ' },
  { label: 'H2', title: 'Heading 2', linePrefix: '## ' },
  { label: '•', title: 'Bullet list', linePrefix: '- ' },
  { label: '1.', title: 'Numbered list', linePrefix: '1. ' },
  { label: '“”', title: 'Quote', linePrefix: '> ' },
  { label: '</>', title: 'Inline code', wrap: '`' },
  { label: 'Link', title: 'Link', link: true },
];

const TAB_WRITE = 'write';
const TAB_PREVIEW = 'preview';
const TAB_SPLIT = 'split';

export function MarkdownEditor({
  value = '',
  onChange,
  label,
  hint,
  error,
  rows = 14,
  placeholder = 'Write your post in Markdown…',
  className,
}) {
  const textareaRef = useRef(null);
  const [tab, setTab] = useState(TAB_WRITE);

  const applyAction = (action) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    let next;
    let cursorStart;
    let cursorEnd;

    if (action.wrap) {
      const content = selected || action.placeholder || 'text';
      next = `${before}${action.wrap}${content}${action.wrap}${after}`;
      cursorStart = start + action.wrap.length;
      cursorEnd = cursorStart + content.length;
    } else if (action.linePrefix) {
      const lineStart = before.lastIndexOf('\n') + 1;
      const prefix = action.linePrefix;
      next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
      cursorStart = start + prefix.length;
      cursorEnd = end + prefix.length;
    } else if (action.link) {
      const label = selected || 'link text';
      const snippet = `[${label}](https://)`;
      next = `${before}${snippet}${after}`;
      cursorStart = start + 1;
      cursorEnd = cursorStart + label.length;
    } else {
      return;
    }

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const tabBtnClass = (key) =>
    cn(
      'h-8 rounded-md px-3 text-xs font-medium transition-colors',
      tab === key
        ? 'bg-slate-900 text-white'
        : 'bg-white text-slate-600 hover:bg-slate-100',
    );

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}

      <div className="rounded-lg border border-slate-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {TOOLBAR.map((action) => (
              <button
                key={action.title}
                type="button"
                title={action.title}
                onClick={() => applyAction(action)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
            <button type="button" className={tabBtnClass(TAB_WRITE)} onClick={() => setTab(TAB_WRITE)}>
              Write
            </button>
            <button type="button" className={tabBtnClass(TAB_SPLIT)} onClick={() => setTab(TAB_SPLIT)}>
              Split
            </button>
            <button type="button" className={tabBtnClass(TAB_PREVIEW)} onClick={() => setTab(TAB_PREVIEW)}>
              Preview
            </button>
          </div>
        </div>

        <div
          className={cn(
            'grid gap-0',
            tab === TAB_SPLIT ? 'md:grid-cols-2' : 'grid-cols-1',
          )}
        >
          {(tab === TAB_WRITE || tab === TAB_SPLIT) && (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={rows}
              placeholder={placeholder}
              className={cn(
                'w-full resize-y bg-white px-3 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none',
                tab === TAB_SPLIT && 'md:border-r md:border-slate-200',
              )}
              spellCheck
            />
          )}
          {(tab === TAB_PREVIEW || tab === TAB_SPLIT) && (
            <div
              className={cn(
                'overflow-auto px-4 py-3',
                tab === TAB_SPLIT && 'md:max-h-[28rem]',
              )}
            >
              <MarkdownPreview source={value} />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
