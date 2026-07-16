import { ReactNode } from 'react';
import { Droplet, Heart, Shield, Activity, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left visual panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />
        </div>
        <div className="relative">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <Droplet className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">LifeLink</span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">Join a community of lifesavers.</h2>
          <p className="mt-3 text-brand-100">Every registration brings us closer to ensuring no patient waits alone for the blood they need.</p>
          <div className="mt-8 space-y-4">
            {[
              { icon: <Heart className="h-5 w-5" />, t: 'AI-powered matching', d: 'Smart algorithms find the right donor fast.' },
              { icon: <Shield className="h-5 w-5" />, t: 'Verified & secure', d: 'Role-based access with hospital and bank verification.' },
              { icon: <Activity className="h-5 w-5" />, t: 'Real-time coordination', d: 'Emergency requests reach donors in minutes.' },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">{f.icon}</div>
                <div>
                  <p className="text-sm font-semibold">{f.t}</p>
                  <p className="text-sm text-brand-100">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-brand-200">© 2026 LifeLink. Saving lives, together.</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Droplet className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-900">LifeLink</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
