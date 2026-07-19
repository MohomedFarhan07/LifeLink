import { useEffect, useState } from 'react';
import { BookOpen, Check, Edit3, Heart, Megaphone, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Awareness, Campaign, SuccessStory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { fetchAi } from '../../lib/api';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { ImageDropzone } from '../shared/ImageDropzone';

type ContentType = 'awareness' | 'story' | 'campaign';
type Form = { title: string; description: string; content: string; category: string; image_url: string; recipient_name: string; story_date: string; location: string; event_date: string; goal_units: string };
type ChatApiResponse = { success?: boolean; message?: string; data?: { reply?: string } };
const emptyForm: Form = { title: '', description: '', content: '', category: 'general', image_url: '', recipient_name: '', story_date: new Date().toISOString().slice(0, 10), location: '', event_date: new Date().toISOString().slice(0, 10), goal_units: '0' };
const requestContentGeneration = async (message: string) => {
  const response = await fetchAi('chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const payload = await response.json().catch(() => null) as ChatApiResponse | null;
  const reply = payload?.success === true && typeof payload.data?.reply === 'string' ? payload.data.reply.trim() : '';
  if (!response.ok || !reply) throw new Error(payload?.message || 'Could not generate content.');
  return reply;
};

export function ContentManager({ role }: { role: 'blood_bank' | 'hospital' }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [awareness, setAwareness] = useState<Awareness[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editor, setEditor] = useState<{ type: ContentType; item?: Awareness | SuccessStory | Campaign } | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingArticle, setGeneratingArticle] = useState(false);

  const load = async () => {
    if (!profile) return;
    const storiesResult = await supabase.from('success_stories').select('*').eq('author_id', profile.id).order('story_date', { ascending: false });
    setStories((storiesResult.data as SuccessStory[]) || []);
    if (role === 'blood_bank') {
      const [articlesResult, campaignsResult] = await Promise.all([
        supabase.from('awareness').select('*').eq('author_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').eq('organizer_id', profile.id).order('event_date', { ascending: false }),
      ]);
      setAwareness((articlesResult.data as Awareness[]) || []);
      setCampaigns((campaignsResult.data as Campaign[]) || []);
    }
  };

  useEffect(() => { void load(); }, [profile?.id, role]);

  const openEditor = (type: ContentType, item?: Awareness | SuccessStory | Campaign) => {
    setEditor({ type, item });
    if (!item) return setForm(emptyForm);
    const base = { ...emptyForm, title: item.title, description: item.description, image_url: item.image_url };
    if (type === 'awareness') { const a = item as Awareness; setForm({ ...base, content: a.content, category: a.category, location: a.location }); }
    else if (type === 'story') { const s = item as SuccessStory; setForm({ ...base, recipient_name: s.recipient_name, story_date: s.story_date, location: s.location }); }
    else { const c = item as Campaign; setForm({ ...base, location: c.location, event_date: c.event_date, goal_units: String(c.goal_units) }); }
  };

  const save = async () => {
    if (!profile || !editor || !form.title.trim()) return toast('Please enter a title.', 'error');
    if (!form.image_url) return toast('Please add a cover image before publishing.', 'error');
    const { type, item } = editor;
    const values = type === 'awareness'
      ? { title: form.title, description: form.description, content: form.content, category: form.category || 'general', image_url: form.image_url, location: form.location, author_id: profile.id, author_name: profile.full_name }
      : type === 'story'
        ? { title: form.title, description: form.description, image_url: form.image_url, location: form.location, recipient_name: form.recipient_name, story_date: form.story_date, author_id: profile.id, author_name: profile.full_name }
        : { title: form.title, description: form.description, image_url: form.image_url, location: form.location, event_date: form.event_date, goal_units: Number(form.goal_units) || 0, organizer_id: profile.id, organizer_name: profile.full_name };
    const table = type === 'awareness' ? 'awareness' : type === 'story' ? 'success_stories' : 'campaigns';
    const query = item ? supabase.from(table).update(values).eq('id', item.id) : supabase.from(table).insert(values);
    const { error } = await query;
    if (error) return toast('Failed to save: ' + error.message, 'error');
    toast(item ? 'Content updated.' : 'Content published.'); setEditor(null); void load();
  };

  const generateDescription = async () => {
    if (!editor || !form.title.trim() || !form.description.trim()) return toast('Add a title and a few description keywords first.', 'error');
    setGeneratingDescription(true);
    const contentType = editor.type === 'awareness' ? 'blood-donation awareness article' : editor.type === 'campaign' ? 'blood-donation campaign' : 'blood-donation success story';
    const context = editor.type === 'campaign'
      ? `Location: ${form.location || 'not provided'}. Date: ${form.event_date}. Goal: ${form.goal_units || 'not provided'} units.`
      : editor.type === 'story'
        ? `Location: ${form.location || 'not provided'}. Recipient name: ${form.recipient_name || 'not provided'}. Story date: ${form.story_date}.`
        : `Category: ${form.category || 'general'}. Location: ${form.location || 'not provided'}.`;
    const prompt = `You are LifeLink's expert public-health content writer. Write a compelling, accurate description for a ${contentType}.

Title: ${form.title}
Author notes/keywords: ${form.description}
${context}

Return only the finished description, with no heading, quotation marks, prompt discussion, or generic greeting. Use 55 to 85 words in one or two short paragraphs. Be warm, inclusive, and action-oriented. Do not invent dates, statistics, partnerships, eligibility rules, medical facts, or patient details. For success stories, write respectfully and avoid identifying sensitive health information.`;
    try {
      const description = await requestContentGeneration(prompt);
      setForm((current) => ({ ...current, description }));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate a description.', 'error');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const generateArticle = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.content.trim()) return toast('Add a title, description, and article keywords first.', 'error');
    setGeneratingArticle(true);
    const prompt = `You are LifeLink's expert public-health writer. Create a clear, trustworthy awareness article about blood donation.

Title: ${form.title}
Category: ${form.category || 'general'}
Summary: ${form.description}
Required topics/outline: ${form.content}

Return only the finished article, not a greeting or an explanation of your process. Use the title as a Markdown H2 heading, then write 350 to 500 words with short paragraphs and useful Markdown subheadings or bullet points where appropriate. Keep the language friendly and easy to understand. Give general educational information only; never diagnose, promise eligibility, invent medical facts or local policies, or add unsupported statistics. When individual medical eligibility is relevant, advise readers to consult a blood bank or clinician.`;
    try {
      const article = await requestContentGeneration(prompt);
      setForm((current) => ({ ...current, content: article }));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate the article.', 'error');
    } finally {
      setGeneratingArticle(false);
    }
  };

  const remove = async (type: ContentType, id: string) => {
    if (!window.confirm('Delete this item?')) return;
    const table = type === 'awareness' ? 'awareness' : type === 'story' ? 'success_stories' : 'campaigns';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast('Failed to delete: ' + error.message, 'error');
    toast('Content deleted.'); void load();
  };

  const lists: { type: ContentType; title: string; subtitle: string; icon: React.ReactNode; items: (Awareness | SuccessStory | Campaign)[] }[] = [
    ...(role === 'blood_bank' ? [{ type: 'awareness' as const, title: 'Awareness Articles', subtitle: 'Publish donation education', icon: <BookOpen className="h-5 w-5" />, items: awareness }, { type: 'campaign' as const, title: 'Donation Campaigns', subtitle: 'Manage local donation drives', icon: <Megaphone className="h-5 w-5" />, items: campaigns }] : []),
    { type: 'story', title: 'Success Stories', subtitle: 'Share positive donation outcomes', icon: <Heart className="h-5 w-5" />, items: stories },
  ];

  return <div className="grid gap-6 xl:grid-cols-2">{lists.map((list) => <Card key={list.type} className={list.type === 'story' && role === 'hospital' ? 'xl:col-span-2' : ''}>
    <CardHeader title={list.title} subtitle={list.subtitle} icon={list.icon} action={<Button size="sm" onClick={() => openEditor(list.type)} icon={<Plus className="h-4 w-4" />}>Create</Button>} />
    <div className="p-5">{list.items.length === 0 ? <EmptyState icon={list.icon} title={`No ${list.title.toLowerCase()} yet`} description="Create your first item to publish it on LifeLink." /> : <div className="space-y-3">{list.items.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p></div><button onClick={() => openEditor(list.type, item)} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove(list.type, item.id)} className="p-1.5 text-slate-400 hover:text-brand-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div>
  </Card>)}
  <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.item ? 'Edit Content' : 'Create Content'} size="lg" footer={<><Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button><Button onClick={save} icon={<Check className="h-4 w-4" />}>{editor?.item ? 'Save Changes' : 'Publish'}</Button></>}><div className="space-y-4"><Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><div className="rounded-xl border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-700">Description</p><Button type="button" size="sm" variant="outline" loading={generatingDescription} onClick={() => void generateDescription()} icon={<Sparkles className="h-4 w-4" />} aria-label="Generate description with AI" title="Generate description with AI" /></div><div className="relative"><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Example: mobile blood drive, weekend, local community, encourage first-time donors" />{generatingDescription && <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/85 text-sm font-medium text-brand-700 backdrop-blur-sm"><Sparkles className="mr-2 h-4 w-4 animate-pulse" />Generating your description…</div>}</div></div>{editor && <ImageDropzone value={form.image_url} contentType={editor.type} onChange={(image_url) => setForm({ ...form, image_url })} />}{(editor?.type === 'awareness' || editor?.type === 'story') && <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Colombo, Sri Lanka" />}{editor?.type === 'awareness' && <><Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><div className="rounded-xl border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-700">Article Content</p><Button type="button" size="sm" variant="outline" loading={generatingArticle} onClick={() => void generateArticle()} icon={<Sparkles className="h-4 w-4" />} aria-label="Generate article content with AI" title="Generate article content with AI" /></div><div className="relative"><Textarea rows={7} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Add article keywords or a short outline before generating" />{generatingArticle && <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/85 text-sm font-medium text-brand-700 backdrop-blur-sm"><Sparkles className="mr-2 h-4 w-4 animate-pulse" />Generating your article…</div>}</div></div></>}{editor?.type === 'story' && <div className="grid gap-4 sm:grid-cols-2"><Input label="Recipient Name" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /><Input label="Story Date" type="date" value={form.story_date} onChange={(e) => setForm({ ...form, story_date: e.target.value })} /></div>}{editor?.type === 'campaign' && <div className="grid gap-4 sm:grid-cols-2"><Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><Input label="Event Date" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /><Input label="Goal Units" type="number" min="0" value={form.goal_units} onChange={(e) => setForm({ ...form, goal_units: e.target.value })} /></div>}</div></Modal></div>;
}
