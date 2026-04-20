import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/cn.js';

// Tailwind v4 doesn't ship @tailwindcss/typography by default, so we style
// the rendered HTML explicitly. Keep this in sync with how the user app
// renders markdown.
const components = {
  h1: (props) => (
    <h1 className="mb-3 mt-5 text-2xl font-semibold text-slate-900" {...props} />
  ),
  h2: (props) => (
    <h2 className="mb-2 mt-5 text-xl font-semibold text-slate-900" {...props} />
  ),
  h3: (props) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-900" {...props} />
  ),
  p: (props) => <p className="my-3 leading-7 text-slate-700" {...props} />,
  a: (props) => (
    <a
      className="text-sky-700 underline underline-offset-2 hover:text-sky-800"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="my-3 list-disc pl-6 text-slate-700" {...props} />
  ),
  ol: (props) => (
    <ol className="my-3 list-decimal pl-6 text-slate-700" {...props} />
  ),
  li: (props) => <li className="my-1 leading-7" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-4 border-slate-300 bg-slate-50 px-4 py-2 italic text-slate-600"
      {...props}
    />
  ),
  code: ({ inline, className, children, ...props }) =>
    inline ? (
      <code
        className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className={cn('font-mono text-sm', className)} {...props}>
        {children}
      </code>
    ),
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border-b border-slate-200 px-3 py-2 text-slate-700" {...props} />
  ),
  hr: () => <hr className="my-6 border-slate-200" />,
  img: (props) => (
    <img
      className="my-4 max-h-96 w-full rounded-lg object-cover"
      loading="lazy"
      alt=""
      {...props}
    />
  ),
};

export function MarkdownPreview({ source, className, placeholder = 'Nothing to preview yet.' }) {
  const trimmed = (source ?? '').trim();
  if (!trimmed) {
    return (
      <div className={cn('text-sm italic text-slate-400', className)}>
        {placeholder}
      </div>
    );
  }
  return (
    <div className={cn('text-[15px]', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
