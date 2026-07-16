import { useState, useEffect, useCallback } from 'react';
import { HandHeart, Plus, Calendar, Users, BookOpen, Megaphone, TrendingUp, MapPin, Image, Check, Edit3, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge, VerificationBadge } from '../../components/shared/Badges';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { Campaign, Awareness, SuccessStory, Volunteer } from '../../types';
import { formatDate, CITIES } from '../../lib/utils';

type Tab = 'overview' | 'campaigns' | 'awareness' | 'stories' | 'profile';

export function VolunteerDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [awareness, setAwareness] = useState<Awareness[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);

  // modals
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [awarenessOpen, setAwarenessOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [editAwareness, setEditAwareness] = useState<Awareness | null>(null);

  // forms
  const [cForm, setCForm] = useState({ title: '', description: '', image_url: '', location: CITIES[0], event_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], goal_units: 50 });
  const [aForm, setAForm] = useState({ title: '', description: '', content: '', category: 'general', image_url: '' });
  const [sForm, setSForm] = useState({ title: '', description: '', image_url: '', recipient_name: '', story_date: new Date().toISOString().split('T')[0] });

  const loadData = useCallback(async () => {
    if (!profile) return;
    const { data: v } = await supabase.from('volunteers').select('*').eq('user_id', profile.id).maybeSingle();
    setVolunteer(v as Volunteer | null);

    const { data: c } = await supabase.from('campaigns').select('*').or(`organizer_id.eq.${profile.id}`).order('event_date', { ascending: false });
    setCampaigns((c as Campaign[]) || []);

    const { data: a } = await supabase.from('awareness').select('*').eq('author_id', profile.id).order('created_at', { ascending: false });
    setAwareness((a as Awareness[]) || []);

    const { data: s } = await supabase.from('success_stories').select('*').eq('author_id', profile.id).order('story_date', { ascending: false });
    setStories((s as SuccessStory[]) || []);

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createCampaign = async () => {
    if (!profile) return;
    const { error } = await supabase.from('campaigns').insert({
      title: cForm.title,
      description: cForm.description,
      image_url: cForm.image_url,
      location: cForm.location,
      event_date: cForm.event_date,
      organizer_id: profile.id,
      organizer_name: profile.full_name,
      goal_units: cForm.goal_units,
      status: 'upcoming',
    });
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    setCampaignOpen(false);
    setCForm({ title: '', description: '', image_url: '', location: CITIES[0], event_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], goal_units: 50 });
    toast('Campaign created successfully!');
    loadData();
  };

  const createAwareness = async () => {
    if (!profile) return;
    const { error } = await supabase.from('awareness').insert({
      title: aForm.title,
      description: aForm.description,
      content: aForm.content,
      category: aForm.category,
      image_url: aForm.image_url,
      author_id: profile.id,
      author_name: profile.full_name,
    });
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    setAwarenessOpen(false);
    setAForm({ title: '', description: '', content: '', category: 'general', image_url: '' });
    toast('Awareness article published!');
    loadData();
  };

  const updateAwareness = async () => {
    if (!editAwareness) return;
    await supabase.from('awareness').update({
      title: aForm.title, description: aForm.description, content: aForm.content, category: aForm.category, image_url: aForm.image_url,
    }).eq('id', editAwareness.id);
    setEditAwareness(null);
    toast('Article updated.');
    loadData();
  };

  const deleteAwareness = async (a: Awareness) => {
    await supabase.from('awareness').delete().eq('id', a.id);
    setAwareness((prev) => prev.filter((x) => x.id !== a.id));
    toast('Article deleted.');
  };

  const createStory = async () => {
    if (!profile) return;
    const { error } = await supabase.from('success_stories').insert({
      title: sForm.title,
      description: sForm.description,
      image_url: sForm.image_url,
      recipient_name: sForm.recipient_name,
      story_date: sForm.story_date,
      author_id: profile.id,
      author_name: profile.full_name,
    });
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    setStoryOpen(false);
    setSForm({ title: '', description: '', image_url: '', recipient_name: '', story_date: new Date().toISOString().split('T')[0] });
    toast('Success story published!');
    loadData();
  };

  const deleteStory = async (s: SuccessStory) => {
    await supabase.from('success_stories').delete().eq('id', s.id);
    setStories((prev) => prev.filter((x) => x.id !== s.id));
    toast('Story deleted.');
  };

  if (loading) return <DashboardLayout><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></DashboardLayout>;

  const totalParticipants = campaigns.reduce((s, c) => s + c.participants_count, 0);
  const upcomingCampaigns = campaigns.filter((c) => c.status === 'upcoming');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'awareness', label: 'Awareness', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'stories', label: 'Success Stories', icon: <HandHeart className="h-4 w-4" /> },
    { id: 'profile', label: 'Organization', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{volunteer?.organization_name || profile?.full_name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {volunteer && <VerificationBadge status={volunteer.verification_status} />}
            <span>{volunteer?.location}</span>
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Campaigns" value={campaigns.length} icon={<Megaphone className="h-5 w-5" />} accent="brand" />
            <StatCard label="Upcoming Events" value={upcomingCampaigns.length} icon={<Calendar className="h-5 w-5" />} accent="sky" />
            <StatCard label="Participants" value={totalParticipants} icon={<Users className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Articles Published" value={awareness.length} icon={<BookOpen className="h-5 w-5" />} accent="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Quick Actions" subtitle="Create new content" icon={<Plus className="h-5 w-5" />} />
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <button onClick={() => setCampaignOpen(true)} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
                  <Megaphone className="h-6 w-6 text-brand-600" />
                  <span className="text-xs font-medium text-slate-700">New Campaign</span>
                </button>
                <button onClick={() => setAwarenessOpen(true)} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
                  <BookOpen className="h-6 w-6 text-sky-600" />
                  <span className="text-xs font-medium text-slate-700">Awareness Article</span>
                </button>
                <button onClick={() => setStoryOpen(true)} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30">
                  <HandHeart className="h-6 w-6 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-700">Success Story</span>
                </button>
              </div>
            </Card>

            <Card>
              <CardHeader title="Upcoming Campaigns" icon={<Calendar className="h-5 w-5" />} />
              <div className="p-5">
                {upcomingCampaigns.length === 0 ? (
                  <EmptyState icon={<Calendar className="h-6 w-6" />} title="No upcoming campaigns" description="Create a campaign to organize a donation drive." />
                ) : (
                  <div className="space-y-3">
                    {upcomingCampaigns.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{c.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location} · {formatDate(c.event_date)}</p>
                        </div>
                        <Badge variant="info">{c.participants_count} joined</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Campaigns */}
      {tab === 'campaigns' && (
        <Card>
          <CardHeader title="Donation Campaigns" subtitle="Organize and manage donation drives and events" icon={<Megaphone className="h-5 w-5" />} action={<Button size="sm" onClick={() => setCampaignOpen(true)} icon={<Plus className="h-4 w-4" />}>New Campaign</Button>} />
          <div className="p-5">
            {campaigns.length === 0 ? (
              <EmptyState icon={<Megaphone className="h-6 w-6" />} title="No campaigns yet" description="Create your first donation campaign to start organizing events." action={<Button onClick={() => setCampaignOpen(true)} icon={<Plus className="h-4 w-4" />}>New Campaign</Button>} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {campaigns.map((c) => (
                  <div key={c.id} className="overflow-hidden rounded-lg border border-slate-200">
                    {c.image_url && <img src={c.image_url} alt={c.title} className="h-36 w-full object-cover" loading="lazy" />}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(c.event_date)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500"><Users className="inline h-3 w-3 mr-1" />{c.participants_count} participants · Goal: {c.goal_units} units</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Awareness */}
      {tab === 'awareness' && (
        <Card>
          <CardHeader title="Awareness Articles" subtitle="Educate the public about donation" icon={<BookOpen className="h-5 w-5" />} action={<Button size="sm" onClick={() => setAwarenessOpen(true)} icon={<Plus className="h-4 w-4" />}>New Article</Button>} />
          <div className="p-5">
            {awareness.length === 0 ? (
              <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No articles published" description="Write your first awareness article to educate the community." action={<Button onClick={() => setAwarenessOpen(true)} icon={<Plus className="h-4 w-4" />}>New Article</Button>} />
            ) : (
              <div className="space-y-3">
                {awareness.map((a) => (
                  <div key={a.id} className="flex items-start gap-4 rounded-lg border border-slate-200 p-4">
                    {a.image_url && <img src={a.image_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="brand" className="capitalize">{a.category}</Badge>
                        <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900">{a.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{a.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditAwareness(a); setAForm({ title: a.title, description: a.description, content: a.content, category: a.category, image_url: a.image_url }); }} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => deleteAwareness(a)} className="rounded p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Stories */}
      {tab === 'stories' && (
        <Card>
          <CardHeader title="Success Stories" subtitle="Share inspiring donation stories" icon={<HandHeart className="h-5 w-5" />} action={<Button size="sm" onClick={() => setStoryOpen(true)} icon={<Plus className="h-4 w-4" />}>New Story</Button>} />
          <div className="p-5">
            {stories.length === 0 ? (
              <EmptyState icon={<HandHeart className="h-6 w-6" />} title="No stories published" description="Share a success story to inspire more donors." action={<Button onClick={() => setStoryOpen(true)} icon={<Plus className="h-4 w-4" />}>New Story</Button>} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {stories.map((s) => (
                  <div key={s.id} className="overflow-hidden rounded-lg border border-slate-200">
                    {s.image_url && <img src={s.image_url} alt={s.title} className="h-36 w-full object-cover" loading="lazy" />}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.description}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500">{s.recipient_name} · {formatDate(s.story_date)}</span>
                        <button onClick={() => deleteStory(s)} className="text-xs text-slate-400 hover:text-brand-600"><Trash2 className="inline h-3.5 w-3.5 mr-1" />Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Profile */}
      {tab === 'profile' && volunteer && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Organization Information" icon={<Users className="h-5 w-5" />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <InfoField label="Organization" value={volunteer.organization_name} />
              <InfoField label="NGO Registration" value={volunteer.ngo_registration_number} />
              <InfoField label="Contact" value={volunteer.contact_number} />
              <InfoField label="Location" value={volunteer.location} />
              <InfoField label="Verification" value={volunteer.verification_status} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Account" icon={<Users className="h-5 w-5" />} />
            <div className="space-y-4 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <HandHeart className="h-9 w-9" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Campaign modal */}
      <Modal open={campaignOpen} onClose={() => setCampaignOpen(false)} title="Create Donation Campaign" size="lg" footer={<><Button variant="outline" onClick={() => setCampaignOpen(false)}>Cancel</Button><Button onClick={createCampaign} icon={<Check className="h-4 w-4" />}>Create Campaign</Button></>}>
        <div className="space-y-4">
          <Input label="Campaign Title" required value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} placeholder="Annual Blood Drive 2026" />
          <Textarea label="Description" rows={3} value={cForm.description} onChange={(e) => setCForm({ ...cForm, description: e.target.value })} placeholder="Describe the campaign..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Location" value={cForm.location} onChange={(e) => setCForm({ ...cForm, location: e.target.value })}>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            <Input label="Event Date" type="date" value={cForm.event_date} onChange={(e) => setCForm({ ...cForm, event_date: e.target.value })} />
            <Input label="Goal (units)" type="number" min={1} value={cForm.goal_units} onChange={(e) => setCForm({ ...cForm, goal_units: Number(e.target.value) })} />
            <Input label="Image URL" icon={<Image className="h-4 w-4" />} value={cForm.image_url} onChange={(e) => setCForm({ ...cForm, image_url: e.target.value })} placeholder="https://..." hint="Optional — link to a campaign image" />
          </div>
        </div>
      </Modal>

      {/* Awareness modal (create + edit) */}
      <Modal open={awarenessOpen || !!editAwareness} onClose={() => { setAwarenessOpen(false); setEditAwareness(null); }} title={editAwareness ? 'Edit Article' : 'Create Awareness Article'} size="lg" footer={<><Button variant="outline" onClick={() => { setAwarenessOpen(false); setEditAwareness(null); }}>Cancel</Button><Button onClick={editAwareness ? updateAwareness : createAwareness} icon={<Check className="h-4 w-4" />}>{editAwareness ? 'Update' : 'Publish'}</Button></>}>
        <div className="space-y-4">
          <Input label="Title" required value={aForm.title} onChange={(e) => setAForm({ ...aForm, title: e.target.value })} placeholder="The Blood Donation Process" />
          <Input label="Short Description" required value={aForm.description} onChange={(e) => setAForm({ ...aForm, description: e.target.value })} placeholder="A brief summary shown on cards" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Category" value={aForm.category} onChange={(e) => setAForm({ ...aForm, category: e.target.value })}>
              <option value="general">General</option><option value="process">Process</option><option value="benefits">Benefits</option><option value="organ">Organ Donation</option><option value="eligibility">Eligibility</option>
            </Select>
            <Input label="Image URL" icon={<Image className="h-4 w-4" />} value={aForm.image_url} onChange={(e) => setAForm({ ...aForm, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <Textarea label="Article Content" rows={6} value={aForm.content} onChange={(e) => setAForm({ ...aForm, content: e.target.value })} placeholder="Write the full article..." hint="Supports line breaks" />
        </div>
      </Modal>

      {/* Story modal */}
      <Modal open={storyOpen} onClose={() => setStoryOpen(false)} title="Create Success Story" size="lg" footer={<><Button variant="outline" onClick={() => setStoryOpen(false)}>Cancel</Button><Button onClick={createStory} icon={<Check className="h-4 w-4" />}>Publish Story</Button></>}>
        <div className="space-y-4">
          <Input label="Story Title" required value={sForm.title} onChange={(e) => setSForm({ ...sForm, title: e.target.value })} placeholder="A Second Chance at Life" />
          <Textarea label="Description" rows={4} required value={sForm.description} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} placeholder="Tell the inspiring story..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Recipient Name" value={sForm.recipient_name} onChange={(e) => setSForm({ ...sForm, recipient_name: e.target.value })} placeholder="Sarah M." />
            <Input label="Story Date" type="date" value={sForm.story_date} onChange={(e) => setSForm({ ...sForm, story_date: e.target.value })} />
          </div>
          <Input label="Image URL" icon={<Image className="h-4 w-4" />} value={sForm.image_url} onChange={(e) => setSForm({ ...sForm, image_url: e.target.value })} placeholder="https://..." />
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{value || '—'}</p>
    </div>
  );
}
