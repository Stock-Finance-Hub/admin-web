import { cn } from '../lib/cn.js';

const TONES = {
  error: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  info: 'bg-sky-50 border-sky-200 text-sky-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

export function Alert({ tone = 'info', title, children, className }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        TONES[tone],
        className,
      )}
      role="alert"
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && 'mt-1')}>{children}</div>}
    </div>
  );
}
