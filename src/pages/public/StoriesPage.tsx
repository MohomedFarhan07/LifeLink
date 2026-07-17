import { useEffect, useState } from 'react';
import { Heart, Quote, Calendar, User, Search } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { SuccessStory } from '../../types';
import { formatDate } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { ChatbotWidget } from '../../components/public/ChatbotWidget';

export function StoriesPage() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SuccessStory | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('success_stories').select('*').order('story_date', { ascending: false });
      setStories((data as SuccessStory[]) || []);
      setLoading(false);
    })();
  }, []);

  const query = search.trim().toLocaleLowerCase();
  const filtered = stories.filter((s) => {
    const searchable = [s.title, s.description, s.location, s.recipient_name, s.author_name].join(' ').toLocaleLowerCase();
    return !query || searchable.includes(query);
  });

  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Heart className="h-3.5 w-3.5" /> Success Stories
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Stories of Hope & Second Chances</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Real lives transformed through the generosity of blood and organ donors.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{filtered.length} stor{filtered.length === 1 ? 'y' : 'ies'}</p>
          <div className="w-full sm:w-64">
            <Input icon={<Search className="h-4 w-4" />} placeholder="Search title, description, location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Heart className="h-6 w-6" />} title="No stories yet" description="Check back soon for inspiring donation success stories." />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} hover onClick={() => setSelected(s)} className="overflow-hidden">
                {s.image_url && (
                  <div className="h-52 w-full overflow-hidden bg-slate-100">
                    <img src={s.image_url} alt={s.title} className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" loading="lazy" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-brand-600">
                    <Quote className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Success Story</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900 line-clamp-2">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 line-clamp-3">{s.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {s.recipient_name}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(s.story_date)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} size="lg" subtitle={selected ? `${selected.recipient_name} · ${formatDate(selected.story_date)}` : ''}>
        {selected && (
          <div>
            {selected.image_url && (
              <img src={selected.image_url} alt={selected.title} className="mb-4 h-64 w-full rounded-lg object-cover" />
            )}
            <p className="text-sm leading-relaxed text-slate-700">{selected.description}</p>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
              <Heart className="h-4 w-4" /> Shared by {selected.author_name || 'LifeLink Team'}
            </div>
          </div>
        )}
      </Modal>

      <ChatbotWidget />
    </PublicPage>
  );
}
