import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  trend?: { value: string; positive?: boolean };
  accent?: 'brand' | 'emerald' | 'sky' | 'amber' | 'slate';
}

const accentClasses = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({ label, value, icon, trend, accent = 'brand' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accentClasses[accent]}`}>{icon}</div>
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-slate-500'}`}>{trend.value}</span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
