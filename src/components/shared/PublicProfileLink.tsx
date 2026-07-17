import { Link } from 'react-router-dom';
import { Role } from '../../types';

export function PublicProfileLink({ userId, label, role, className = '' }: { userId?: string; label: string; role?: Role; className?: string }) {
  if (!userId || role === 'admin') return <span className={className}>{label}</span>;
  return <Link to={`/people/${userId}`} className={`transition-colors hover:text-brand-600 hover:underline ${className}`}>{label}</Link>;
}
