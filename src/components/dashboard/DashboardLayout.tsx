import { useState, useEffect, useCallback } from 'react';
import { Droplet, Menu, X, LogOut, Bell, Home, ChevronDown } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { supabase } from '../../lib/supabase';
import { NotificationItem } from '../../types';
import { timeAgo } from '../../lib/utils';
import { ThemeToggle } from '../ui/ThemeToggle';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const navByRole: Record<Role, NavItem[]> = {
  donor: [
    { label: 'Overview', to: '/dashboard', icon: <Home className="h-5 w-5" /> },
  ],
  hospital: [
    { label: 'Overview', to: '/dashboard', icon: <Home className="h-5 w-5" /> },
  ],
  blood_bank: [
    { label: 'Overview', to: '/dashboard', icon: <Home className="h-5 w-5" /> },
  ],
  admin: [
    { label: 'Overview', to: '/dashboard', icon: <Home className="h-5 w-5" /> },
  ],
};

const roleLabels: Record<Role, string> = {
  donor: 'Donor',
  hospital: 'Hospital',
  blood_bank: 'Blood Bank',
  admin: 'Administrator',
};

const roleColors: Record<Role, string> = {
  donor: 'bg-brand-50 text-brand-600',
  hospital: 'bg-sky-50 text-sky-600',
  blood_bank: 'bg-emerald-50 text-emerald-600',
  admin: 'bg-slate-100 text-slate-600',
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const role = profile?.role || 'donor';
  const navItems = navByRole[role];

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as NotificationItem[]) || []);
  }, [profile]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const isActive = (to: string) => (to === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(to));

  if (!profile) return null;

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50">
      {/* Sidebar - desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 xl:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Droplet className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">Life<span className="text-brand-600">Link</span></span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 xl:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <div className={`mb-4 flex items-center gap-3 rounded-lg ${roleColors[role]} p-3`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-semibold text-slate-700 shadow-sm">
              {profile.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{profile.full_name}</p>
              <p className="text-xs text-slate-500">{roleLabels[role]}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.to) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
              <Home className="h-5 w-5" /> Public Site
            </Link>
            <button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">
              <LogOut className="h-5 w-5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 xl:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col xl:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 xl:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900 sm:text-lg">{roleLabels[role]} Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) markAllRead(); }}
                className="relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-slide-up">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`border-b border-slate-50 px-4 py-3 ${n.is_read ? '' : 'bg-brand-50/40'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-900">{n.title}</p>
                              {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                            </div>
                            {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                            <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                {profile.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 xl:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
