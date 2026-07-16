import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, HelpCircle, Info, Search, Sparkles } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { Awareness, Faq } from '../../types';
import { formatDate } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { ChatbotWidget } from '../../components/public/ChatbotWidget';

export function AwarenessPage() {
  const [articles, setArticles] = useState<Awareness[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [selected, setSelected] = useState<Awareness | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: f }] = await Promise.all([
        supabase.from('awareness').select('*').order('created_at', { ascending: false }),
        supabase.from('faqs').select('*').order('display_order', { ascending: true }),
      ]);
      setArticles(a as Awareness[] || []);
      setFaqs(f as Faq[] || []);
      setLoading(false);
    })();
  }, []);

  const categories = ['all', ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = articles.filter(
    (a) =>
      (category === 'all' || a.category === category) &&
      (a.title.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()))
  );

  const faqCategories = Array.from(new Set(faqs.map((f) => f.category)));

  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" /> Awareness Programs
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Donation Awareness</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Learn about blood and organ donation, the process, benefits, and answers to common questions.</p>
        </div>
      </section>

      {/* Articles */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Awareness Articles</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <Input icon={<Search className="h-4 w-4" />} placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                category === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c === 'all' ? 'All Topics' : c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No articles found" description="Try a different search or category filter." />
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <Card key={a.id} hover onClick={() => setSelected(a)} className="overflow-hidden">
                {a.image_url && (
                  <div className="h-44 w-full overflow-hidden bg-slate-100">
                    <img src={a.image_url} alt={a.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  <Badge variant="brand" className="capitalize">{a.category}</Badge>
                  <h3 className="mt-3 text-base font-semibold text-slate-900 line-clamp-2">{a.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">{a.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>By {a.author_name || 'LifeLink'}</span>
                    <span>{formatDate(a.created_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Process highlights */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Donation Benefits at a Glance</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '3', label: 'Lives saved per blood donation' },
              { n: '8', label: 'Lives saved per organ donor' },
              { n: '470ml', label: 'Blood collected per donation' },
              { n: '56 days', label: 'Minimum interval between donations' },
            ].map((s) => (
              <Card key={s.label} className="p-6 text-center">
                <p className="text-4xl font-extrabold text-brand-600">{s.n}</p>
                <p className="mt-2 text-sm text-slate-600">{s.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" /> FAQs
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
        </div>
        <div className="mt-8 space-y-8">
          {faqCategories.map((cat) => (
            <div key={cat}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600 capitalize">{cat}</h3>
              <div className="space-y-2">
                {faqs.filter((f) => f.category === cat).map((f) => (
                  <div key={f.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <button
                      onClick={() => setOpenFaq(openFaq === f.id ? null : f.id)}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                    >
                      <span className="text-sm font-medium text-slate-900">{f.question}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === f.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === f.id && (
                      <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">{f.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {faqs.length === 0 && !loading && (
            <EmptyState icon={<Info className="h-6 w-6" />} title="No FAQs yet" description="Check back soon for answers to common donation questions." />
          )}
        </div>
      </section>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} size="lg" subtitle={selected ? `By ${selected.author_name || 'LifeLink'} · ${formatDate(selected.created_at)}` : ''}>
        {selected && (
          <div>
            {selected.image_url && (
              <img src={selected.image_url} alt={selected.title} className="mb-4 h-56 w-full rounded-lg object-cover" />
            )}
            <Badge variant="brand" className="capitalize">{selected.category}</Badge>
            <p className="mt-3 text-sm text-slate-600">{selected.description}</p>
            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{selected.content}</div>
          </div>
        )}
      </Modal>

      <ChatbotWidget />
    </PublicPage>
  );
}
