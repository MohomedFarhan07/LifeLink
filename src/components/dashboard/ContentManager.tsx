import { useEffect, useState } from 'react';
import { BookOpen, Check, Edit3, Heart, Megaphone, Plus, Trash2 } from 'lucide-react';
import { Awareness, Campaign, SuccessStory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

type ContentType = 'awareness' | 'story' | 'campaign';
type Form = { title: string; description: string; content: string; category: string; image_url: string; recipient_name: string; story_date: string; location: string; event_date: string; goal_units: string };
const emptyForm: Form = { title: '', description: '', content: '', category: 'general', image_url: '', recipient_name: '', story_date: new Date().toISOString().slice(0, 10), location: '', event_date: new Date().toISOString().slice(0, 10), goal_units: '0' };

export function ContentManager({ role }: { role: 'blood_bank' | 'hospital' }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [awareness, setAwareness] = useState<Awareness[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editor, setEditor] = useState<{ type: ContentType; item?: Awareness | SuccessStory | Campaign } | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

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

  return <div className="grid gap-6 lg:grid-cols-2">{lists.map((list) => <Card key={list.type} className={list.type === 'story' && role === 'hospital' ? 'lg:col-span-2' : ''}>
    <CardHeader title={list.title} subtitle={list.subtitle} icon={list.icon} action={<Button size="sm" onClick={() => openEditor(list.type)} icon={<Plus className="h-4 w-4" />}>Create</Button>} />
    <div className="p-5">{list.items.length === 0 ? <EmptyState icon={list.icon} title={`No ${list.title.toLowerCase()} yet`} description="Create your first item to publish it on LifeLink." /> : <div className="space-y-3">{list.items.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p></div><button onClick={() => openEditor(list.type, item)} className="p-1.5 text-slate-400 hover:text-brand-600"><Edit3 className="h-4 w-4" /></button><button onClick={() => remove(list.type, item.id)} className="p-1.5 text-slate-400 hover:text-brand-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div>
  </Card>)}
  <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.item ? 'Edit Content' : 'Create Content'} size="lg" footer={<><Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button><Button onClick={save} icon={<Check className="h-4 w-4" />}>{editor?.item ? 'Save Changes' : 'Publish'}</Button></>}><div className="space-y-4"><Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />{(editor?.type === 'awareness' || editor?.type === 'story') && <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Colombo, Sri Lanka" />}{editor?.type === 'awareness' && <><Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><Textarea label="Article Content" rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></>}{editor?.type === 'story' && <div className="grid gap-4 sm:grid-cols-2"><Input label="Recipient Name" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /><Input label="Story Date" type="date" value={form.story_date} onChange={(e) => setForm({ ...form, story_date: e.target.value })} /></div>}{editor?.type === 'campaign' && <div className="grid gap-4 sm:grid-cols-2"><Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><Input label="Event Date" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /><Input label="Goal Units" type="number" min="0" value={form.goal_units} onChange={(e) => setForm({ ...form, goal_units: e.target.value })} /></div>}<Input label="Image URL (optional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div></Modal></div>;
}
