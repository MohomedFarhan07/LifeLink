import { useState, useEffect, useCallback } from 'react';
import { Users, Building2, Activity, Droplet, Shield, Check, X, Trash2, TrendingUp, BookOpen, Heart, AlertTriangle, Search, Brain, Plus, Pencil } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { VerificationBadge, StatusBadge, BloodGroupBadge } from '../../components/shared/Badges';
import { BarChart, DonutChart, LineChart } from '../../components/ui/Charts';
import { supabase } from '../../lib/supabase';
import { Profile, Hospital, BloodBank, BloodRequest, Donation, Awareness, SuccessStory, Faq } from '../../types';
import { formatDate, BLOOD_GROUPS, timeAgo } from '../../lib/utils';
import { sendNotification } from '../../lib/notifications';
import { useToast } from '../../components/ui/Toast';
import { PublicProfileLink } from '../../components/shared/PublicProfileLink';

type Tab = 'overview' | 'users' | 'verifications' | 'content' | 'requests';

export function AdminDashboard() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [awareness, setAwareness] = useState<Awareness[]>([]);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'general', display_order: '0' });

  const loadData = useCallback(async () => {
    // Load users via edge function (admin-only)
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-actions?action=users`;
    const headers = {
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json',
    };
    let usersLoaded = false;
    try {
      const res = await fetch(apiUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users as Profile[]);
          usersLoaded = true;
        }
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
    // The profiles policy allows authenticated users to read profiles. This keeps
    // the Admin Users page functional if the Edge Function is unavailable.
    if (!usersLoaded) {
      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profilesError) console.error('Failed to load profiles:', profilesError);
      else setUsers((profileRows as Profile[]) || []);
    }

    const [h, b, r, d, a, s, f] = await Promise.all([
      supabase.from('hospitals').select('*').order('created_at', { ascending: false }),
      supabase.from('blood_banks').select('*').order('created_at', { ascending: false }),
      supabase.from('blood_requests').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('awareness').select('*').order('created_at', { ascending: false }),
      supabase.from('success_stories').select('*').order('story_date', { ascending: false }),
      supabase.from('faqs').select('*').order('display_order', { ascending: true }),
    ]);
    setHospitals((h.data as Hospital[]) || []);
    setBloodBanks((b.data as BloodBank[]) || []);
    setRequests((r.data as BloodRequest[]) || []);
    setDonations((d.data as Donation[]) || []);
    setAwareness((a.data as Awareness[]) || []);
    setStories((s.data as SuccessStory[]) || []);
    setFaqs((f.data as Faq[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const verifyOrg = async (table: 'hospitals' | 'blood_banks', id: string, status: 'verified' | 'rejected', userId?: string, orgName?: string) => {
    try {
      const { error } = await supabase.rpc('update_organization_verification', {
        organization_table: table,
        organization_id: id,
        new_status: status,
      });
      if (error) throw error;
      if (table === 'hospitals') setHospitals((p) => p.map((x) => (x.id === id ? { ...x, verification_status: status } : x)));
      if (table === 'blood_banks') setBloodBanks((p) => p.map((x) => (x.id === id ? { ...x, verification_status: status } : x)));
      if (userId) {
        await sendNotification(userId, 'verification', `Your organization has been ${status}`, status === 'verified' ? `Congratulations! ${orgName} is now verified on LifeLink.` : `Your verification was rejected. Please contact support.`, '/dashboard');
      }
      toast(`Organization ${status === 'verified' ? 'verified' : 'rejected'} successfully.`);
    } catch (e: any) {
      toast('Failed: ' + e.message, 'error');
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.rpc('delete_user_as_admin', { target_user_id: deleteTarget.id });
      if (error) throw error;
      setUsers((p) => p.filter((u) => u.id !== deleteTarget.id));
      toast('User deleted successfully.');
      setDeleteTarget(null);
    } catch (e: any) {
      toast('Failed to delete user: ' + e.message, 'error');
    }
  };

  const openFaqEditor = (faq?: Faq) => {
    setEditingFaq(faq || null);
    setFaqForm(faq
      ? { question: faq.question, answer: faq.answer, category: faq.category, display_order: String(faq.display_order) }
      : { question: '', answer: '', category: 'general', display_order: String(faqs.length) });
    setFaqModalOpen(true);
  };

  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast('Please enter both a question and an answer.', 'error');
      return;
    }
    const values = {
      question: faqForm.question.trim(),
      answer: faqForm.answer.trim(),
      category: faqForm.category.trim() || 'general',
      display_order: Number(faqForm.display_order) || 0,
    };
    const query = editingFaq
      ? supabase.from('faqs').update(values).eq('id', editingFaq.id).select().single()
      : supabase.from('faqs').insert(values).select().single();
    const { data, error } = await query;
    if (error) {
      toast('Failed to save FAQ: ' + error.message, 'error');
      return;
    }
    const saved = data as Faq;
    setFaqs((current) => (editingFaq
      ? current.map((faq) => faq.id === saved.id ? saved : faq)
      : [...current, saved]).sort((a, b) => a.display_order - b.display_order));
    setFaqModalOpen(false);
    toast(editingFaq ? 'FAQ updated successfully.' : 'FAQ added successfully.');
  };

  const deleteFaq = async (faq: Faq) => {
    if (!window.confirm(`Delete the FAQ “${faq.question}”?`)) return;
    const { error } = await supabase.from('faqs').delete().eq('id', faq.id);
    if (error) {
      toast('Failed to delete FAQ: ' + error.message, 'error');
      return;
    }
    setFaqs((current) => current.filter((item) => item.id !== faq.id));
    toast('FAQ deleted successfully.');
  };

  if (loading) return <DashboardLayout><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></DashboardLayout>;

  // Analytics
  const donorsCount = users.filter((u) => u.role === 'donor').length;
  const hospitalsCount = users.filter((u) => u.role === 'hospital').length;
  const banksCount = users.filter((u) => u.role === 'blood_bank').length;
  const completedDonations = donations.filter((d) => d.status === 'completed').length;
  const activeRequests = requests.filter((r) => r.status === 'open').length;
  const pendingHospitals = hospitals.filter((h) => h.verification_status === 'pending');
  const pendingBanks = bloodBanks.filter((b) => b.verification_status === 'pending');
  const pendingVerifications = pendingHospitals.length + pendingBanks.length;

  // Blood group distribution (from donors — we need to fetch donor records; approximate from requests)
  const bloodGroupData = BLOOD_GROUPS.map((g) => ({
    label: g,
    value: requests.filter((r) => r.blood_group === g).length,
  }));

  const roleData = [
    { label: 'Donors', value: donorsCount, color: '#dc2626' },
    { label: 'Hospitals', value: hospitalsCount, color: '#0ea5e9' },
    { label: 'Blood Banks', value: banksCount, color: '#10b981' },
  ];

  // Donations over time (last 6 months mock from created_at)
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString('en-US', { month: 'short' });
    const value = donations.filter((don) => {
      const dm = new Date(don.created_at);
      return dm.getMonth() === d.getMonth() && dm.getFullYear() === d.getFullYear();
    }).length;
    return { label, value };
  });

  const searchTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filteredUsers = users.filter((user) => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (searchTerms.length === 0) return true;
    const searchable = [user.full_name, user.email, user.phone, user.city, user.address, user.role]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchTerms.every((term) => searchable.includes(term));
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Analytics', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'verifications', label: 'Verifications', icon: <Shield className="h-4 w-4" />, badge: pendingVerifications },
    { id: 'content', label: 'Content', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'requests', label: 'Requests', icon: <Droplet className="h-4 w-4" />, badge: activeRequests },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Manage users, verify organizations, and monitor platform analytics.</p>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}{t.label}
            {t.badge ? <span className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${tab === t.id ? 'bg-white text-brand-600' : 'bg-brand-600 text-white'}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Overview / Analytics */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Registered Donors" value={donorsCount} icon={<Droplet className="h-5 w-5" />} accent="brand" />
            <StatCard label="Hospitals" value={hospitalsCount} icon={<Building2 className="h-5 w-5" />} accent="sky" />
            <StatCard label="Successful Donations" value={completedDonations} icon={<Heart className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Active Emergency Requests" value={activeRequests} icon={<AlertTriangle className="h-5 w-5" />} accent="amber" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Blood Banks" value={banksCount} icon={<Activity className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Pending Verifications" value={pendingVerifications} icon={<Shield className="h-5 w-5" />} accent="brand" />
            <StatCard label="Total Users" value={users.length} icon={<Users className="h-5 w-5" />} accent="slate" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Blood Group Statistics" subtitle="Distribution of blood requests by group" icon={<Droplet className="h-5 w-5" />} />
              <div className="p-5">
                <BarChart data={bloodGroupData} unit="" />
              </div>
            </Card>
            <Card>
              <CardHeader title="User Roles" subtitle="Breakdown by role" icon={<Users className="h-5 w-5" />} />
              <div className="p-5">
                <DonutChart data={roleData} />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Donations Over Time" subtitle="Last 6 months" icon={<TrendingUp className="h-5 w-5" />} />
              <div className="p-5">
                <LineChart data={monthData} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Request Status" icon={<Droplet className="h-5 w-5" />} />
              <div className="space-y-3 p-5">
                {[
                  { label: 'Open', count: requests.filter((r) => r.status === 'open').length, color: 'bg-sky-500' },
                  { label: 'Matched', count: requests.filter((r) => r.status === 'matched').length, color: 'bg-amber-500' },
                  { label: 'Fulfilled', count: requests.filter((r) => r.status === 'fulfilled').length, color: 'bg-emerald-500' },
                  { label: 'Cancelled', count: requests.filter((r) => r.status === 'cancelled').length, color: 'bg-slate-400' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-sm ${s.color}`} />
                      <span className="text-sm text-slate-600">{s.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <Card>
          <CardHeader title="All Users" subtitle={`${users.length} registered users`} icon={<Users className="h-5 w-5" />} />
          <div className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input icon={<Search className="h-4 w-4" />} placeholder="Search name, email, role, city, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-1.5">
                {['all', 'donor', 'hospital', 'blood_bank', 'admin'].map((r) => (
                  <button key={r} onClick={() => setRoleFilter(r)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${roleFilter === r ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {r === 'all' ? 'All' : r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            {filteredUsers.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title="No users found" description={search ? "Try a different search." : "No users registered yet."} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Role</th>
                      <th className="pb-3 pr-4">City</th>
                      <th className="pb-3 pr-4">Joined</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                              {u.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'U'}
                            </div>
                            <PublicProfileLink userId={u.id} role={u.role} label={u.full_name || '—'} className="font-medium text-slate-900" />
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                        <td className="py-3 pr-4"><Badge variant={u.role === 'admin' ? 'neutral' : 'brand'} className="capitalize">{u.role.replace('_', ' ')}</Badge></td>
                        <td className="py-3 pr-4 text-slate-600">{u.city || '—'}</td>
                        <td className="py-3 pr-4 text-slate-500">{formatDate(u.created_at)}</td>
                        <td className="py-3">
                          {u.role !== 'admin' && (
                            <button onClick={() => setDeleteTarget(u)} className="text-xs text-slate-400 hover:text-brand-600">
                              <Trash2 className="inline h-3.5 w-3.5 mr-1" />Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Verifications */}
      {tab === 'verifications' && (
        <div className="space-y-6">
          {pendingVerifications === 0 && (
            <Card>
              <EmptyState icon={<Check className="h-6 w-6" />} title="All verified" description="No organizations pending verification." />
            </Card>
          )}
          {pendingHospitals.length > 0 && (
            <Card>
              <CardHeader title="Hospitals Awaiting Verification" subtitle={`${pendingHospitals.length} pending`} icon={<Building2 className="h-5 w-5" />} />
              <div className="space-y-3 p-5">
                {pendingHospitals.map((h) => (
                  <div key={h.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><Building2 className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <PublicProfileLink userId={h.user_id} role="hospital" label={h.hospital_name || 'Hospital'} className="text-sm font-semibold text-slate-900" />
                      <p className="text-xs text-slate-500">Reg: {h.registration_number} · {h.hospital_type} · {h.location}</p>
                    </div>
                    <VerificationBadge status={h.verification_status} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => verifyOrg('hospitals', h.id, 'verified', h.user_id, h.hospital_name)} icon={<Check className="h-4 w-4" />}>Verify</Button>
                      <Button size="sm" variant="outline" onClick={() => verifyOrg('hospitals', h.id, 'rejected', h.user_id, h.hospital_name)} icon={<X className="h-4 w-4" />}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {pendingBanks.length > 0 && (
            <Card>
              <CardHeader title="Blood Banks Awaiting Verification" subtitle={`${pendingBanks.length} pending`} icon={<Activity className="h-5 w-5" />} />
              <div className="space-y-3 p-5">
                {pendingBanks.map((b) => (
                  <div key={b.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Activity className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <PublicProfileLink userId={b.user_id} role="blood_bank" label={b.bank_name || 'Blood Bank'} className="text-sm font-semibold text-slate-900" />
                      <p className="text-xs text-slate-500">License: {b.license_number} · {b.location}</p>
                    </div>
                    <VerificationBadge status={b.verification_status} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => verifyOrg('blood_banks', b.id, 'verified', b.user_id, b.bank_name)} icon={<Check className="h-4 w-4" />}>Verify</Button>
                      <Button size="sm" variant="outline" onClick={() => verifyOrg('blood_banks', b.id, 'rejected', b.user_id, b.bank_name)} icon={<X className="h-4 w-4" />}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Content management */}
      {tab === 'content' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Awareness Articles" subtitle={`${awareness.length} articles`} icon={<BookOpen className="h-5 w-5" />} />
            <div className="p-5">
              {awareness.length === 0 ? (
                <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No articles" description="Awareness articles will appear here." />
              ) : (
                <div className="space-y-2">
                  {awareness.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500">By {a.author_name || 'System'} · {formatDate(a.created_at)}</p>
                      </div>
                      <Badge variant="brand" className="capitalize">{a.category}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Success Stories" subtitle={`${stories.length} stories`} icon={<Heart className="h-5 w-5" />} />
            <div className="p-5">
              {stories.length === 0 ? (
                <EmptyState icon={<Heart className="h-6 w-6" />} title="No stories" description="Success stories will appear here." />
              ) : (
                <div className="space-y-2">
                  {stories.slice(0, 8).map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                      {s.image_url && <img src={s.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{s.title}</p>
                        <p className="text-xs text-slate-500">{s.recipient_name} · {formatDate(s.story_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader
              title="Frequently Asked Questions"
              subtitle={`${faqs.length} published FAQs`}
              icon={<BookOpen className="h-5 w-5" />}
              action={<Button size="sm" onClick={() => openFaqEditor()} icon={<Plus className="h-4 w-4" />}>Add FAQ</Button>}
            />
            <div className="p-5">
              {faqs.length === 0 ? (
                <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No FAQs yet" description="Add common questions to help LifeLink users." action={<Button onClick={() => openFaqEditor()} icon={<Plus className="h-4 w-4" />}>Add first FAQ</Button>} />
              ) : (
                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{faq.question}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{faq.answer}</p>
                        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{faq.category} · Order {faq.display_order}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => openFaqEditor(faq)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Edit FAQ"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => deleteFaq(faq)} className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600" title="Delete FAQ"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <Card>
          <CardHeader title="All Blood Requests" subtitle={`${requests.length} requests across the platform`} icon={<Droplet className="h-5 w-5" />} />
          <div className="p-5">
            {requests.length === 0 ? (
              <EmptyState icon={<Droplet className="h-6 w-6" />} title="No requests" description="Blood requests will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-4">Blood</th>
                      <th className="pb-3 pr-4">Hospital</th>
                      <th className="pb-3 pr-4">Urgency</th>
                      <th className="pb-3 pr-4">Units</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">AI Score</th>
                      <th className="pb-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 20).map((r) => (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-3 pr-4"><BloodGroupBadge group={r.blood_group} size="sm" /></td>
                        <td className="py-3 pr-4 text-slate-600 truncate max-w-[160px]"><PublicProfileLink userId={r.hospital_id} role="hospital" label={r.hospital_name || 'Hospital'} /></td>
                        <td className="py-3 pr-4"><Badge variant={r.patient_urgency === 'critical' ? 'error' : r.patient_urgency === 'high' ? 'warning' : 'info'} dot className="capitalize">{r.patient_urgency}</Badge></td>
                        <td className="py-3 pr-4 text-slate-600">{r.quantity_units}</td>
                        <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                        <td className="py-3 pr-4"><Badge variant="neutral"><Brain className="inline h-3 w-3 mr-0.5" />{r.ai_priority_score}</Badge></td>
                        <td className="py-3 text-slate-500">{timeAgo(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        subtitle="This action permanently removes the user and all their data"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={deleteUser} icon={<Trash2 className="h-4 w-4" />}>Delete Permanently</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email})? This will remove their profile, donations, and all associated data. This action cannot be undone.</p>
      </Modal>

      <Modal
        open={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        title={editingFaq ? 'Edit FAQ' : 'Add FAQ'}
        subtitle="This question and answer will be stored in Supabase."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFaqModalOpen(false)}>Cancel</Button>
            <Button onClick={saveFaq} icon={<Check className="h-4 w-4" />}>{editingFaq ? 'Save Changes' : 'Add FAQ'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Question" required value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="Who can donate blood?" />
          <Textarea label="Answer" required rows={5} value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} placeholder="Provide a clear, medically reviewed answer..." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Category" value={faqForm.category} onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })} placeholder="Eligibility" />
            <Input label="Display Order" type="number" min="0" value={faqForm.display_order} onChange={(e) => setFaqForm({ ...faqForm, display_order: e.target.value })} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
