import { useState } from 'react';
import { Droplet, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About Donation', to: '/about' },
  { label: 'Awareness', to: '/awareness' },
  { label: 'Success Stories', to: '/stories' },
  { label: 'Contact', to: '/contact' },
];

export function PublicNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Droplet className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">
            Life<span className="text-brand-600">Link</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive(link.to) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {profile ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Become a Donor
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="rounded-lg p-2 text-slate-600"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${
                  isActive(link.to) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Theme</span>
              <ThemeToggle />
            </div>
            <div className="my-2 h-px bg-slate-100" />
            {profile ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg bg-brand-600 px-3.5 py-2.5 text-sm font-medium text-white text-center">
                  Dashboard
                </Link>
                <button onClick={() => { setMobileOpen(false); signOut(); }} className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 text-left">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setMobileOpen(false); navigate('/login'); }} className="rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 text-left">
                  Login
                </button>
                <button onClick={() => { setMobileOpen(false); navigate('/register'); }} className="rounded-lg bg-brand-600 px-3.5 py-2.5 text-sm font-medium text-white">
                  Become a Donor
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Droplet className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-white">LifeLink</span>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Connecting donors, hospitals, blood banks, and volunteers to save lives through coordinated blood and organ donation.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white">About Donation</Link></li>
              <li><Link to="/awareness" className="hover:text-white">Awareness Programs</Link></li>
              <li><Link to="/stories" className="hover:text-white">Success Stories</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Get Involved</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-white">Register as Donor</Link></li>
              <li><Link to="/register" className="hover:text-white">Hospital Registration</Link></li>
              <li><Link to="/register" className="hover:text-white">Blood Bank Network</Link></li>
              <li><Link to="/register" className="hover:text-white">Volunteer / NGO</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Emergency</h4>
            <p className="mt-3 text-sm text-slate-400">24/7 blood emergency hotline</p>
            <p className="mt-1 text-2xl font-bold text-white">1919</p>
            <p className="mt-2 text-xs text-slate-500">LifeLink connects verified hospitals with compatible donors in minutes.</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">© 2026 LifeLink. All rights reserved. Every donation saves lives.</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/medical-disclaimer" className="hover:text-white">Medical Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
