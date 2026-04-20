import { cn } from '../lib/cn.js';

export function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-8 w-8 border-[3px]' };
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-slate-300 border-t-slate-900',
        sizes[size],
        className,
      )}
      aria-label="Loading"
    />
  );
}
