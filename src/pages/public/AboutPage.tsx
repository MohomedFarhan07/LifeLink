import { Droplet, Heart, Clock, Shield, Activity, Users, CheckCircle2, Info, Brain } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ChatbotWidget } from '../../components/public/ChatbotWidget';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Info className="h-3.5 w-3.5" /> About Donation
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Understanding Blood & Organ Donation</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Donation is one of the most impactful acts of kindness. One blood donor can save up to three lives, and a single organ donor can save up to eight.
          </p>
        </div>
      </section>

      {/* Blood donation process */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">The Blood Donation Process</h2>
            <p className="mt-2 text-slate-600">The entire process takes about an hour, with the actual donation lasting only 8-10 minutes.</p>
            <div className="mt-6 space-y-4">
              {[
                { t: 'Registration', d: 'Sign in, show ID, and complete a confidential health questionnaire.' },
                { t: 'Mini-physical', d: 'A nurse checks your pulse, blood pressure, temperature, and hemoglobin.' },
                { t: 'Donation', d: 'A sterile needle draws about 470ml of blood while you rest comfortably.' },
                { t: 'Refreshments', d: 'Relax with juice and snacks for 10-15 minutes before leaving.' },
              ].map((s, i) => (
                <div key={s.t} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{s.t}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Organ Donation Process</h2>
            <p className="mt-2 text-slate-600">Organ donation gives the gift of life to those with end-stage organ failure.</p>
            <div className="mt-6 space-y-4">
              {[
                { t: 'Register your decision', d: 'Sign up as an organ donor and share your wishes with your family.' },
                { t: 'Medical evaluation', d: 'At the time of death, medical teams assess which organs are suitable for donation.' },
                { t: 'Matching recipients', d: 'A national registry matches organs to patients based on blood type, size, and urgency.' },
                { t: 'Surgical recovery', d: 'Organs are recovered in a respectful surgical procedure, then quickly transplanted.' },
              ].map((s, i) => (
                <div key={s.t} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{i + 1}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{s.t}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Benefits of Donating Blood</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Saving lives is the biggest reward — but donors gain personal benefits too.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <Shield className="h-6 w-6" />, t: 'Free Health Check', d: 'Each donation includes a mini-physical checking blood pressure, pulse, and hemoglobin levels.' },
              { icon: <Heart className="h-6 w-6" />, t: 'Reduced Heart Risk', d: 'Regular donors may have lower iron stores, linked to reduced cardiovascular disease risk.' },
              { icon: <Activity className="h-6 w-6" />, t: 'Calorie Burn', d: 'Your body burns about 650 calories replacing the donated blood components.' },
              { icon: <Brain className="h-6 w-6" />, t: 'Mental Wellbeing', d: 'Altruistic giving releases endorphins, reduces stress, and boosts emotional health.' },
              { icon: <Users className="h-6 w-6" />, t: 'Save 3 Lives', d: 'Each whole blood donation is split into red cells, plasma, and platelets — helping up to 3 patients.' },
              { icon: <Clock className="h-6 w-6" />, t: 'Fast Recovery', d: 'Plasma is replaced in 24 hours; red blood cells regenerate within 4-6 weeks.' },
            ].map((b) => (
              <Card key={b.t} hover className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{b.icon}</div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{b.t}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{b.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Eligibility quick list */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="p-8">
            <h3 className="text-lg font-semibold text-slate-900">You can donate if you are:</h3>
            <ul className="mt-4 space-y-3">
              {['Aged 18-65 years', 'Weighing at least 50 kg (110 lbs)', 'In good general health', 'Hemoglobin above 12.5 g/dL', 'Free from any infection', 'Have not donated in the last 8 weeks'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-8">
            <h3 className="text-lg font-semibold text-slate-900">Wait to donate if you have:</h3>
            <ul className="mt-4 space-y-3">
              {['Had a tattoo or piercing in the last 6 months (unlicensed)', 'Had surgery in the last 6 months', 'Been pregnant or breastfeeding', 'Had a fever in the last 2 weeks', 'Taken antibiotics in the last 7 days', 'Travelled to malaria-risk areas recently'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <Clock className="h-5 w-5 shrink-0 text-amber-500" /> {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="mt-12 text-center">
          <Button size="lg" onClick={() => navigate('/register')} icon={<Droplet className="h-5 w-5" />}>
            Register as a Donor
          </Button>
        </div>
      </section>

      <ChatbotWidget />
    </PublicPage>
  );
}
