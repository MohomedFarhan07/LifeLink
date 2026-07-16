import { HeartHandshake, ShieldCheck, Users } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { Card } from '../../components/ui/Card';

export function AboutUsPage() {
  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"><HeartHandshake className="h-3.5 w-3.5" /> About LifeLink</div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Connecting generosity with urgent need</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">LifeLink brings donors, hospitals, and blood banks together to make blood and organ donation coordination simpler, safer, and faster.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Our purpose</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Every donation should reach the people who need it.</h2>
            <p className="mt-5 leading-7 text-slate-600">LifeLink is a digital coordination platform for blood and organ donation. We help people find clear information, help hospitals make urgent requests, and help trusted organizations manage donation activity in one connected place.</p>
            <p className="mt-4 leading-7 text-slate-600">Our goal is to reduce delays, improve visibility, and strengthen the community around lifesaving donations—while respecting privacy and clinical decision-making.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <HeartHandshake className="h-6 w-6" />, title: 'Coordinate with care', text: 'Bring the right people and organizations together when every minute matters.' },
              { icon: <ShieldCheck className="h-6 w-6" />, title: 'Build trust', text: 'Support verification and responsible handling of donation information.' },
              { icon: <Users className="h-6 w-6" />, title: 'Grow community', text: 'Give donors, hospitals, and blood banks a shared place to act.' },
            ].map((item) => (
              <Card key={item.title} className="p-6 last:sm:col-span-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{item.icon}</div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
