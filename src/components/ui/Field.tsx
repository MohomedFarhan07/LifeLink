import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
}

const baseField =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500';

export function Input({ label, error, hint, required, icon, className = '', ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input className={`${baseField} ${icon ? 'pl-10' : ''} ${error ? 'border-brand-500 focus:ring-brand-500/30' : ''} ${className}`} {...props} />
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-brand-600">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, required, className = '', ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>
      )}
      <textarea className={`${baseField} ${error ? 'border-brand-500' : ''} ${className}`} {...props} />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-brand-600">{error}</p>}
    </div>
  );
}

export function Select({ label, error, hint, required, className = '', children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>
      )}
      <select className={`${baseField} ${error ? 'border-brand-500' : ''} ${className}`} {...props}>
        {children}
      </select>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-brand-600">{error}</p>}
    </div>
  );
}
