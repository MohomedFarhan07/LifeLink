import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Newspaper, RefreshCw } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChatbotWidget } from '../../components/public/ChatbotWidget';

interface NewsItem {
  url: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain?: string;
  sourcecountry?: string;
}

interface NewsResponse {
  articles?: NewsItem[];
}

const PAGE_SIZE = 8;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80';
const NEWS_QUERY = '("blood donation" OR "organ donation" OR "blood transfusion" OR "blood bank" OR "public health")';

function formatNewsDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?/);
  if (!match) return value;
  const [, year, month, day, hour, minute, second = '00'] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function NewsShimmer() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
          <div className="news-shimmer aspect-video rounded-xl" />
          <div className="mt-4 space-y-2.5 px-1 pb-1">
            <div className="news-shimmer h-4 w-11/12 rounded" />
            <div className="news-shimmer h-4 w-8/12 rounded" />
            <div className="news-shimmer mt-4 h-3 w-5/12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsPage() {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        query: NEWS_QUERY,
        mode: 'artlist',
        format: 'json',
        maxrecords: '100',
        timespan: '3months',
        sort: 'datedesc',
      });
      const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`);
      if (!response.ok) throw new Error('Unable to load the latest news.');
      const data = await response.json() as NewsResponse;
      const latest = (data.articles || []).filter((article) => article.title && article.url);
      setArticles(latest);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the latest news.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNews(); }, [loadNews]);

  const totalPages = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
  const pageArticles = useMemo(() => articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [articles, page]);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1);

  return (
    <PublicPage>
      <section className="public-hero py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"><Newspaper className="h-3.5 w-3.5" /> Latest health news</div>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">Blood & Organ Donation News</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">The newest available coverage of blood donation, organ donation, transfusion, blood banks, and public health.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 lg:p-7">
          <div className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Newsroom</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Fresh stories from trusted outlets</h2>
              <p className="mt-1 text-sm text-slate-500">{articles.length ? `${articles.length} current stories, sorted newest first.` : 'Searching global news sources for the latest stories.'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadNews()} icon={<RefreshCw className="h-4 w-4" />}>Refresh latest news</Button>
          </div>

        {loading ? (
          <NewsShimmer />
        ) : error ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-sm text-brand-700">{error} <button className="ml-2 font-semibold underline" onClick={() => void loadNews()}>Try again</button></div>
        ) : articles.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No recent matching stories were found. Try refreshing shortly.</div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pageArticles.map((article) => (
                <Card key={article.url} hover className="group overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
                  <div className="relative overflow-hidden">
                    <img src={article.socialimage || FALLBACK_IMAGE} alt="" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(event) => { event.currentTarget.src = FALLBACK_IMAGE; }} />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/65 to-transparent" />
                    <span className="absolute bottom-3 left-3 max-w-[80%] truncate rounded-full bg-slate-950/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{article.domain || 'Health news'}</span>
                  </div>
                  <div className="p-4">
                    <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-sm font-semibold leading-5 text-slate-900 hover:text-brand-600">
                      <span className="line-clamp-2">{article.title}</span><ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatNewsDate(article.seendate)}</span>
                      {article.domain && <span className="capitalize">{article.domain}</span>}
                      {article.sourcecountry && <span>{article.sourcecountry}</span>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)} icon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
              {pageNumbers.map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                  {index > 0 && pageNumbers[index - 1] !== item - 1 && <span className="text-slate-400">…</span>}
                  <button onClick={() => setPage(item)} className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium ${page === item ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>
                </span>
              ))}
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} icon={<ChevronRight className="h-4 w-4" />}>Next</Button>
            </div>
          </>
        )}
        </div>
      </section>
      <ChatbotWidget />
    </PublicPage>
  );
}
