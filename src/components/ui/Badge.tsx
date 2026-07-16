import { ReactNode } from 'react';

type Variant = 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-brand-50 text-brand-700',
  info: 'bg-sky-50 text-sky-700',
  neutral: 'bg-slate-100 text-slate-600',
};

const dotClasses: Record<Variant, string> = {
  default: 'bg-slate-400',
  brand: 'bg-brand-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-brand-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
};

export function Badge({ variant = 'default', children, className = '', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
}
