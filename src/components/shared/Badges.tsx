import { BloodGroup, Urgency, VerificationStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { urgencyLabel, verificationLabel } from '../../lib/utils';

export function BloodGroupBadge({ group, size = 'md' }: { group: BloodGroup; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 font-bold text-brand-700 ${
        size === 'sm' ? 'h-7 min-w-[2rem] px-1.5 text-xs' : size === 'lg' ? 'h-11 min-w-[3rem] px-2.5 text-base' : 'h-9 min-w-[2.5rem] px-2 text-sm'
      }`}
    >
      {group}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const map: Record<Urgency, { variant: 'error' | 'warning' | 'info'; dot: boolean; pulse: boolean }> = {
    critical: { variant: 'error', dot: true, pulse: true },
    high: { variant: 'warning', dot: true, pulse: false },
    normal: { variant: 'info', dot: true, pulse: false },
  };
  const cfg = map[urgency];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.variant === 'error' ? 'bg-brand-50 text-brand-700' : cfg.variant === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
      {cfg.dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.variant === 'error' ? 'bg-brand-500' : cfg.variant === 'warning' ? 'bg-amber-500' : 'bg-sky-500'} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      )}
      {urgencyLabel(urgency)}
    </span>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const map = {
    pending: { variant: 'warning' as const, label: verificationLabel(status) },
    verified: { variant: 'success' as const, label: verificationLabel(status) },
    rejected: { variant: 'error' as const, label: verificationLabel(status) },
  };
  return <Badge variant={map[status].variant} dot>{map[status].label}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    open: { variant: 'info', label: 'Open' },
    matched: { variant: 'warning', label: 'Matched' },
    fulfilled: { variant: 'success', label: 'Fulfilled' },
    expired: { variant: 'neutral', label: 'Expired' },
    cancelled: { variant: 'neutral', label: 'Cancelled' },
    pending: { variant: 'warning', label: 'Pending' },
    accepted: { variant: 'info', label: 'Accepted' },
    rejected: { variant: 'error', label: 'Rejected' },
    completed: { variant: 'success', label: 'Completed' },
    available: { variant: 'success', label: 'Available' },
    reserved: { variant: 'warning', label: 'Reserved' },
    depleted: { variant: 'neutral', label: 'Depleted' },
    upcoming: { variant: 'info', label: 'Upcoming' },
    active: { variant: 'success', label: 'Active' },
    requested: { variant: 'warning', label: 'Requested' },
    approved: { variant: 'info', label: 'Approved' },
    dispatched: { variant: 'info', label: 'Dispatched' },
  };
  const cfg = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
}
