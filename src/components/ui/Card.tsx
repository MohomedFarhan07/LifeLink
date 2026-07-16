import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white shadow-card ${hover ? 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, icon, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
