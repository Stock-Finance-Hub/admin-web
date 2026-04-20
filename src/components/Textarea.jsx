import { forwardRef } from 'react';
import { cn } from '../lib/cn.js';

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, id, rows = 6, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={cn(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 resize-y',
          'focus:outline-none focus:ring-2 focus:ring-slate-900/20',
          error ? 'border-red-400' : 'border-slate-300 focus:border-slate-900',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
