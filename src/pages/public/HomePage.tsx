import { useEffect, useState } from 'react';
import { Droplet, Heart, Activity, Users, Building2, Shield, MapPin, Sparkles, Brain, AlertTriangle, Stethoscope } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { BloodGroupBadge } from '../../components/shared/Badges';
import { supabase } from '../../lib/supabase';
import { BloodGroup } from '../../types';
import { CHATBOT_GREETING, chatbotReply } from '../../lib/ai';
import { ChatbotWidget } from '../../components/public/ChatbotWidget';

export function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ donors: 0, hospitals: 0, donations: 0, requests: 0 });

  useEffect(() => {
    (async () => {
      const [d, h, don, r] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'donor'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'hospital'),
        supabase.from('donations').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('blood_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ]);
      setStats({
        donors: d.count || 0,
        hospitals: h.count || 0,
        donations: don.count || 0,
        requests: r.count || 0,
      });
    })();
  }, []);

  return (
    <PublicPage>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-100 blur-3xl" />
          <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-brand-50 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28 lg:px-8">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered blood donation platform
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Every drop <span className="text-brand-600">saves a life.</span>
              <br /> Every donor is a hero.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              LifeLink connects donors, hospitals, and blood banks in a unified platform —
              using smart matching to find the right donor at the right time, fast.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/register')} icon={<Droplet className="h-5 w-5" />}>
                Become a Donor
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/about')} icon={<Heart className="h-5 w-5" />}>
                Learn About Donation
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-8">
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.donors.toLocaleString()}+</p>
                <p className="text-sm text-slate-500">Active Donors</p>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.hospitals.toLocaleString()}+</p>
                <p className="text-sm text-slate-500">Partner Hospitals</p>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.donations.toLocaleString()}+</p>
                <p className="text-sm text-slate-500">Lives Saved</p>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto max-w-md">
              <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Emergency Request</p>
                      <p className="text-xs text-slate-500">National Hospital, Colombo</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                    Critical
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <BloodGroupBadge group="O-" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">3 units needed</p>
                    <p className="text-xs text-slate-500">Required within 2 hours</p>
                  </div>
                  <Activity className="h-5 w-5 text-brand-500" />
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { name: 'Sarah M.', group: 'O-' as BloodGroup, dist: '2.4 km', match: '98%' },
                    { name: 'James K.', group: 'O-' as BloodGroup, dist: '5.1 km', match: '91%' },
                    { name: 'Aisha N.', group: 'O-' as BloodGroup, dist: '8.7 km', match: '85%' },
                  ].map((d) => (
                    <div key={d.name} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {d.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.dist} away</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-emerald-600">{d.match} match</p>
                        <p className="text-[10px] text-slate-400">AI score</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">AI Smart Donor Matching — ranked by compatibility, distance & availability</p>
              </div>
              <div className="absolute -right-6 -top-6 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-brand-600" />
                  <span className="text-xs font-semibold text-slate-900">AI Assistant</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Online 24/7</p>
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-100">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-600" />
                  <span className="text-xs font-semibold text-slate-900">1 donation = 3 lives</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">One platform. Four ways to save lives.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Whether you give blood, coordinate emergencies, manage inventory, or organize campaigns — LifeLink gives you the tools.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Droplet className="h-6 w-6" />, title: 'Donor', desc: 'Register, manage availability, get matched to emergency requests near you.', color: 'brand' },
            { icon: <Building2 className="h-6 w-6" />, title: 'Hospital', desc: 'Create urgent blood requests and let AI find compatible donors instantly.', color: 'sky' },
            { icon: <Activity className="h-6 w-6" />, title: 'Blood Bank', desc: 'Track inventory, monitor expiry dates, and approve transfers to hospitals.', color: 'emerald' },
            { icon: <Shield className="h-6 w-6" />, title: 'Admin', desc: 'Verify organizations, manage users, and monitor platform analytics.', color: 'slate' },
          ].map((role) => (
            <Card key={role.title} hover className="p-6 text-center">
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${
                role.color === 'brand' ? 'bg-brand-50 text-brand-600' :
                role.color === 'sky' ? 'bg-sky-50 text-sky-600' :
                role.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                role.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-slate-100 text-slate-600'
              }`}>{role.icon}</div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{role.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{role.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Features */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                <Brain className="h-3.5 w-3.5" /> AI-Powered Intelligence
              </div>
              <h2 className="mt-4 text-3xl font-bold text-slate-900">Smart matching that saves minutes when seconds matter</h2>
              <p className="mt-4 text-slate-600">LifeLink uses intelligent algorithms across three critical features:</p>
              <div className="mt-6 space-y-4">
                {[
                  { icon: <Users className="h-5 w-5" />, title: 'Smart Donor Matching', desc: 'Ranks donors by blood compatibility, distance, availability, and donation history.' },
                  { icon: <MessageBotIcon />, title: 'AI Donation Assistant', desc: '24/7 chatbot answers eligibility, preparation, and organ donation questions.' },
                  { icon: <AlertTriangle className="h-5 w-5" />, title: 'Emergency Priority System', desc: 'Auto-classifies requests as Critical, High, or Normal based on urgency and time.' },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">{f.icon}</div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{f.title}</h4>
                      <p className="mt-0.5 text-sm text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100">
              <ChatPreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">How LifeLink works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">From registration to a matched donor in four simple steps.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {[
            { n: '01', title: 'Register', desc: 'Create your account and choose your role — donor, hospital, or blood bank.', icon: <Users className="h-6 w-6" /> },
            { n: '02', title: 'Complete Profile', desc: 'Add your blood group, location, and availability. Hospitals get verified by admins.', icon: <Stethoscope className="h-6 w-6" /> },
            { n: '03', title: 'Get Matched', desc: 'Hospitals post requests; AI instantly ranks the best compatible donors nearby.', icon: <Sparkles className="h-6 w-6" /> },
            { n: '04', title: 'Save Lives', desc: 'Donors accept requests, donations are recorded, and lives are saved.', icon: <Heart className="h-6 w-6" /> },
          ].map((step) => (
            <div key={step.n} className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">{step.icon}</div>
              <p className="mt-4 text-xs font-bold text-brand-600">{step.n}</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
            <div>
              <h2 className="text-3xl font-bold text-white">Ready to become a lifesaver?</h2>
              <p className="mt-2 text-brand-100">Join thousands of donors and organizations on LifeLink today. Registration takes 2 minutes.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="outline" className="border-white bg-white text-brand-700 hover:bg-brand-50" onClick={() => navigate('/register')} icon={<Droplet className="h-5 w-5" />}>
                Register Now
              </Button>
              <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => navigate('/about')} icon={<Heart className="h-5 w-5" />}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ChatbotWidget />
    </PublicPage>
  );
}

function MessageBotIcon() {
  return <span className="text-base font-bold">AI</span>;
}

function ChatPreviewCard() {
  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: CHATBOT_GREETING.text },
  ]);

  const send = (q: string) => {
    setMessages((m) => [...m, { role: 'user', text: q }]);
    const reply = chatbotReply(q);
    setMessages((m) => [...m, { role: 'bot', text: reply.text }]);
  };

  return (
    <div className="flex h-80 flex-col rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">AI</div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Donation Assistant</p>
          <p className="text-xs text-emerald-600">● Online</p>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        {['Who can donate?', 'Is it safe?', 'Organ donation?'].map((q) => (
          <button key={q} onClick={() => send(q)} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm transition-colors hover:bg-brand-50 hover:text-brand-700">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
