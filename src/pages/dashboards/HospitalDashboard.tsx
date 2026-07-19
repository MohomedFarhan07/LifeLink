import { useState, useEffect, useCallback } from 'react';
import { Droplet, Bell, MapPin, Calendar, Activity, Plus, Users, Brain, Sparkles, Check, X, Building2, TrendingUp, FileText, Send, BarChart3, MessageSquare, Heart } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { HospitalAnalytics } from '../../components/dashboard/HospitalAnalytics';
import { ChatPanel } from '../../components/dashboard/ChatPanel';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { BloodGroupBadge, UrgencyBadge, StatusBadge, VerificationBadge } from '../../components/shared/Badges';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { BloodRequest, BloodGroup, Urgency, Hospital, Donation, Profile } from '../../types';
import { formatDate, BLOOD_GROUPS, CITIES, mockCoords } from '../../lib/utils';
import { classifyPriority, rankDonorsForRequest, DonorMatch } from '../../lib/ai';
import { sendNotification } from '../../lib/notifications';
import { ContentManager } from '../../components/dashboard/ContentManager';
import { Connections, HospitalBankFinder, HospitalTransferFinder } from '../../components/dashboard/ApprovedConnections';
import { PublicProfileLink } from '../../components/shared/PublicProfileLink';

type Tab = 'overview' | 'requests' | 'matching' | 'donations' | 'stories' | 'analytics' | 'profile' | 'bank_matching' | 'connections';

export function HospitalDashboard() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [bankRequestView, setBankRequestView] = useState<'blood' | 'connection'>('blood');
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [matchView, setMatchView] = useState<BloodRequest | null>(null);
  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [matching, setMatching] = useState(false);
  const [donorProfiles, setDonorProfiles] = useState<Record<string, Profile>>({});
  const [activeChatDonation, setActiveChatDonation] = useState<Donation | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'delete') return;
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      toast('Failed to delete account: ' + error.message, 'error');
      setDeleting(false);
    } else {
      toast('Account and data deleted successfully.');
      await signOut();
    }
  };

  // create form
  const [form, setForm] = useState({
    blood_group: 'O+' as BloodGroup,
    quantity_units: 1,
    patient_urgency: 'normal' as Urgency,
    location: CITIES[0],
    required_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: '',
  });
  const [aiPreview, setAiPreview] = useState<{ urgency: Urgency; score: number } | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const { data: h } = await supabase.from('hospitals').select('*').eq('user_id', profile.id).maybeSingle();
    setHospital(h as Hospital | null);

    const { data: reqs } = await supabase.from('blood_requests').select('*').eq('hospital_id', profile.id).order('created_at', { ascending: false });
    setRequests((reqs as BloodRequest[]) || []);

    const { data: dons } = await supabase.from('donations').select('*').eq('hospital_id', profile.id).order('created_at', { ascending: false });
    const donsData = (dons as Donation[]) || [];
    setDonations(donsData);

    const donorIds = [...new Set(donsData.map((d) => d.donor_id))];
    if (donorIds.length > 0) {
      const { data: donors } = await supabase.from('profiles').select('*').in('id', donorIds);
      const map: Record<string, Profile> = {};
      (donors as Profile[] || []).forEach((p) => { map[p.id] = p; });
      setDonorProfiles(map);
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase.channel(`hospital-dashboard:${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_requests', filter: `hospital_id=eq.${profile.id}` }, () => { void loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations', filter: `hospital_id=eq.${profile.id}` }, () => { void loadData(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadData, profile?.id]);

  // AI preview when form changes
  useEffect(() => {
    if (createOpen) {
      const result = classifyPriority({
        patientUrgency: form.patient_urgency,
        requiredDate: form.required_date,
        quantity: form.quantity_units,
      });
      setAiPreview(result);
    }
  }, [form.patient_urgency, form.required_date, form.quantity_units, createOpen]);

  const createRequest = async () => {
    if (!profile || !hospital) return;
    const coords = mockCoords(form.location);
    const priority = classifyPriority({
      patientUrgency: form.patient_urgency,
      requiredDate: form.required_date,
      quantity: form.quantity_units,
    });
    const { data, error } = await supabase.from('blood_requests').insert({
      hospital_id: profile.id,
      hospital_name: hospital.hospital_name,
      blood_group: form.blood_group,
      quantity_units: form.quantity_units,
      patient_urgency: priority.urgency,
      location: form.location,
      required_date: form.required_date,
      notes: form.notes,
      status: 'open',
      ai_priority_score: priority.score,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }).select().single();

    if (error) {
      toast('Failed to create request: ' + error.message, 'error');
      return;
    }
    setRequests((prev) => [data as BloodRequest, ...prev]);
    setCreateOpen(false);
    toast(`Emergency request created. AI classified it as ${priority.urgency.toUpperCase()} (score: ${priority.score}).`);

    // Hospitals coordinate with verified blood banks; direct donor matching is intentionally disabled.
    setTab('bank_matching');
  };

  const runMatching = async (req: BloodRequest) => {
    setMatchView(req);
    setMatching(true);
    setMatches([]);
    setTab('matching');

    const { data: donors } = await supabase
      .from('donors')
      .select('*, profiles(full_name, email, phone, city, avatar_url)')
      .eq('availability_status', 'available');

    const donorCoords = mockCoords(req.location);
    const flat = (donors || []).map((d: any) => ({
      ...d,
      full_name: d.profiles?.full_name,
      email: d.profiles?.email,
      phone: d.profiles?.phone,
      city: d.profiles?.city,
    }));
    const ranked = rankDonorsForRequest(
      { blood_group: req.blood_group, location: req.location, required_date: req.required_date },
      flat,
      donorCoords
    );
    setMatches(ranked.slice(0, 20));
    setMatching(false);

    // Notify top matches
    const topN = ranked.slice(0, 5);
    for (const m of topN) {
      await sendNotification(
        m.donor.user_id,
        'emergency_request',
        'You are a possible match for an emergency request',
        `You are a possible match for an emergency ${req.blood_group} blood request near you. Match score: ${m.score}%.`,
        '/dashboard'
      );
    }
    if (topN.length > 0) {
      toast(`${topN.length} compatible donors found and notified.`);
    } else {
      toast('No compatible donors currently available.', 'info');
    }
  };

  const sendRequestToDonor = async (match: DonorMatch) => {
    if (!profile || !matchView) return;
    await supabase.from('donations').insert({
      request_id: matchView.id,
      donor_id: match.donor.user_id,
      hospital_id: profile.id,
      blood_group: matchView.blood_group,
      status: 'pending',
    });
    await sendNotification(
      match.donor.user_id,
      'donation_request',
      `${profile.full_name} sent you a donation request`,
      `${matchView.hospital_name} requests ${matchView.blood_group} blood. You scored ${match.score}% match. Please accept or decline in your dashboard.`,
      '/dashboard'
    );
    toast(`Request sent to ${match.donor.full_name}.`);
    setMatches((prev) => prev.filter((m) => m.donor.user_id !== match.donor.user_id));
  };

  const cancelRequest = async (req: BloodRequest) => {
    await supabase.from('blood_requests').update({ status: 'cancelled' }).eq('id', req.id);
    setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'cancelled' } : r)));
    toast('Request cancelled.');
  };

  if (loading) return <DashboardLayout><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></DashboardLayout>;

  const openRequests = requests.filter((r) => r.status === 'open');
  const completedDonations = donations.filter((d) => d.status === 'completed');

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'requests', label: 'My Requests', icon: <FileText className="h-4 w-4" />, badge: openRequests.length },
    { id: 'bank_matching', label: 'Find Blood Banks', icon: <Building2 className="h-4 w-4" /> },
    { id: 'connections', label: 'My Connections', icon: <MessageSquare className="h-4 w-4" /> },
      { id: 'stories', label: 'Success Stories', icon: <Heart className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'profile', label: 'Hospital Profile', icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{hospital?.hospital_name || profile?.full_name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {hospital && <VerificationBadge status={hospital.verification_status} />}
            <span>{hospital?.hospital_type} hospital · {hospital?.location}</span>
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>New Blood Request</Button>
      </div>

      {/* Tabs */}
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

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Requests" value={openRequests.length} icon={<Bell className="h-5 w-5" />} accent="brand" />
            <StatCard label="Total Requests" value={requests.length} icon={<FileText className="h-5 w-5" />} accent="sky" />
            <StatCard label="Donations Received" value={completedDonations.length} icon={<Droplet className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Pending Donations" value={donations.filter((d) => d.status === 'pending' || d.status === 'accepted').length} icon={<Activity className="h-5 w-5" />} accent="amber" />
          </div>

          <Card>
            <CardHeader title="Recent Blood Requests" icon={<FileText className="h-5 w-5" />} action={<Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>New Request</Button>} />
            <div className="p-5">
              {requests.length === 0 ? (
                <EmptyState icon={<Bell className="h-6 w-6" />} title="No requests yet" description="Create your first blood request to find compatible donors." action={<Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Create Request</Button>} />
              ) : (
                <div className="space-y-3">
                  {requests.slice(0, 5).map((req) => (
                    <div key={req.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center">
                      <BloodGroupBadge group={req.blood_group} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <UrgencyBadge urgency={req.patient_urgency} />
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{req.quantity_units} units · Required by {formatDate(req.required_date)}</p>
                      </div>
                      {req.status === 'open' && <Button size="sm" variant="outline" onClick={() => setTab('bank_matching')} icon={<Building2 className="h-4 w-4" />}>Find Blood Banks</Button>}
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
          <CardHeader title="All Blood Requests" subtitle="Manage and track your emergency requests" icon={<FileText className="h-5 w-5" />} action={<Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>New Request</Button>} />
          <div className="p-5">
            {requests.length === 0 ? (
              <EmptyState icon={<FileText className="h-6 w-6" />} title="No requests yet" description="Create a blood request to start finding donors." action={<Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Create Request</Button>} />
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <BloodGroupBadge group={req.blood_group} size="lg" />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <UrgencyBadge urgency={req.patient_urgency} />
                          <StatusBadge status={req.status} />
                          <Badge variant="neutral">AI Score: {req.ai_priority_score}</Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Droplet className="h-3 w-3" /> {req.quantity_units} units</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Required by {formatDate(req.required_date)}</span>
                          <span>Created {formatDate(req.created_at)}</span>
                        </div>
                        {req.notes && <p className="mt-2 text-sm text-slate-600">{req.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        {req.status === 'open' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setTab('bank_matching')} icon={<Building2 className="h-4 w-4" />}>Find Blood Banks</Button>
                            <Button size="sm" variant="ghost" onClick={() => cancelRequest(req)} icon={<X className="h-4 w-4" />}>Cancel</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Matching */}
      {tab === 'matching' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={matchView ? `AI Donor Matching — ${matchView.blood_group} Request` : 'AI Donor Matching'}
              subtitle={matchView ? `${matchView.hospital_name} · ${matchView.quantity_units} units needed` : 'Select a request to find compatible donors'}
              icon={<Brain className="h-5 w-5" />}
            />
            <div className="p-5">
              {matching ? (
                <div className="flex flex-col items-center py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 animate-pulse">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-700">AI is analyzing donors...</p>
                  <p className="mt-1 text-xs text-slate-500">Ranking by blood compatibility, distance, availability, and donation history.</p>
                </div>
              ) : !matchView ? (
                <EmptyState icon={<Brain className="h-6 w-6" />} title="No request selected" description="Create a new request or select an existing open request to find matching donors." action={openRequests[0] ? <Button onClick={() => runMatching(openRequests[0])} icon={<Brain className="h-4 w-4" />}>Match Latest Request</Button> : <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Create Request</Button>} />
              ) : matches.length === 0 ? (
                <EmptyState icon={<Users className="h-6 w-6" />} title="No compatible donors found" description="No available donors match this blood group right now. Try again later or broaden your search." />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <Check className="h-4 w-4" /> <strong>{matches.length}</strong> compatible donors found and ranked by AI. Top {Math.min(5, matches.length)} have been notified.
                  </div>
                  {matches.map((m, idx) => (
                    <div key={m.donor.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                          idx === 0 ? 'bg-emerald-100 text-emerald-700' : idx === 1 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                        }`}>{idx + 1}</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                          {m.donor.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <PublicProfileLink userId={m.donor.user_id} role="donor" label={m.donor.full_name || 'Donor'} className="text-sm font-semibold text-slate-900" />
                          <BloodGroupBadge group={m.donor.blood_group} size="sm" />
                          {m.exactGroup && <Badge variant="success">Exact match</Badge>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.donor.city || '—'}{m.distanceKm != null && ` · ${m.distanceKm.toFixed(1)} km`}</span>
                          <span className="flex items-center gap-1"><Phone2 /> {m.donor.phone || '—'}</span>
                          {m.donor.last_donation_date && <span>Last donated: {formatDate(m.donor.last_donation_date)}</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.reasons.map((r, i) => <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{r}</span>)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-brand-600">{m.score}<span className="text-sm">%</span></p>
                          <p className="text-[10px] text-slate-400">AI match score</p>
                        </div>
                        <Button size="sm" onClick={() => sendRequestToDonor(m)} icon={<Send className="h-4 w-4" />}>Send Request</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Donations */}
      {tab === 'donations' && (
        <div className="space-y-6">
          {activeChatDonation && profile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => setActiveChatDonation(null)} icon={<Droplet className="h-4 w-4" />}>Back to Donations</Button>
                <Badge variant="success">Chat active</Badge>
              </div>
              <ChatPanel
                donationId={activeChatDonation.id}
                currentUserId={profile.id}
                recipientId={activeChatDonation.donor_id}
                recipientName={donorProfiles[activeChatDonation.donor_id]?.full_name || 'Donor'}
                recipientSubtitle={`${activeChatDonation.blood_group} donation · ${formatDate(activeChatDonation.donation_date)}`}
              />
            </div>
          ) : (
            <Card>
              <CardHeader title="Donations" subtitle="Track incoming donations and chat with donors" icon={<Droplet className="h-5 w-5" />} />
              <div className="p-5">
                {donations.length === 0 ? (
                  <EmptyState icon={<Droplet className="h-6 w-6" />} title="No donations yet" description="Donations from accepted donor requests will appear here." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                          <th className="pb-3 pr-4">Blood Group</th>
                          <th className="pb-3 pr-4">Donor</th>
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {donations.map((d) => {
                          const donor = donorProfiles[d.donor_id];
                          const canChat = d.status === 'accepted' || d.status === 'completed';
                          return (
                            <tr key={d.id} className="border-b border-slate-50">
                              <td className="py-3 pr-4"><BloodGroupBadge group={d.blood_group} size="sm" /></td>
                              <td className="py-3 pr-4 text-slate-600"><PublicProfileLink userId={d.donor_id} role="donor" label={donor?.full_name || 'Donor'} /></td>
                              <td className="py-3 pr-4 text-slate-600">{formatDate(d.donation_date)}</td>
                              <td className="py-3 pr-4"><StatusBadge status={d.status} /></td>
                              <td className="py-3 pr-4">
                                {canChat ? (
                                  <Button size="sm" variant="outline" onClick={() => setActiveChatDonation(d)} icon={<MessageSquare className="h-4 w-4" />}>Chat</Button>
                                ) : d.status === 'pending' ? (
                                  <span className="text-xs text-slate-400">Awaiting acceptance</span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && profile && (
        <HospitalAnalytics hospitalId={profile.id} />
      )}

      {tab === 'bank_matching' && profile && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Blood Bank Services" subtitle="Choose whether you need blood inventory or a direct coordination chat." icon={<Building2 className="h-5 w-5" />} />
            <div className="flex flex-col gap-2 p-4 sm:flex-row">
              <Button variant={bankRequestView === 'blood' ? 'primary' : 'outline'} onClick={() => setBankRequestView('blood')} icon={<Droplet className="h-4 w-4" />}>Request Blood Units</Button>
              <Button variant={bankRequestView === 'connection' ? 'primary' : 'outline'} onClick={() => setBankRequestView('connection')} icon={<MessageSquare className="h-4 w-4" />}>Request a Chat Connection</Button>
            </div>
          </Card>
          {bankRequestView === 'blood' ? <HospitalTransferFinder profile={profile} /> : <HospitalBankFinder profile={profile} />}
        </div>
      )}
      {tab === 'connections' && profile && <Connections profile={profile} />}
      {tab === 'stories' && <ContentManager role="hospital" />}

      {/* Profile */}
      {tab === 'profile' && hospital && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Hospital Information" icon={<Building2 className="h-5 w-5" />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <InfoField label="Hospital Name" value={hospital.hospital_name} />
              <InfoField label="Registration Number" value={hospital.registration_number} />
              <InfoField label="Hospital Type" value={hospital.hospital_type} />
              <InfoField label="Contact Number" value={hospital.contact_number} />
              <InfoField label="Location" value={hospital.location} />
              <InfoField label="Verification Status" value={hospital.verification_status} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Account" icon={<Building2 className="h-5 w-5" />} />
            <div className="space-y-4 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Building2 className="h-9 w-9" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900">{profile?.phone}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Joined</span><span className="font-medium text-slate-900">{formatDate(profile?.created_at)}</span></div>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-brand-600">Danger Zone</h4>
                <p className="mt-1 text-xs text-slate-500">Permanently delete your account and all associated data. This action is irreversible.</p>
                <Button variant="danger" className="mt-3 w-full" onClick={() => { setDeleteConfirm(''); setDeleteOpen(true); }}>
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Emergency Blood Request"
        subtitle="AI will automatically classify priority and find matching donors"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createRequest} icon={<Sparkles className="h-4 w-4" />}>Create & Match Donors</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Required Blood Group" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value as BloodGroup })}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Input label="Quantity (units)" type="number" min={1} max={10} value={form.quantity_units} onChange={(e) => setForm({ ...form, quantity_units: Number(e.target.value) })} />
            <Select label="Patient Urgency Level" value={form.patient_urgency} onChange={(e) => setForm({ ...form, patient_urgency: e.target.value as Urgency })}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Input label="Required Date" type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} />
            <Select label="Hospital Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Textarea label="Additional Notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Patient condition, specific requirements..." />

          {/* AI preview */}
          {aiPreview && (
            <div className={`rounded-lg p-4 ${aiPreview.urgency === 'critical' ? 'bg-brand-50' : aiPreview.urgency === 'high' ? 'bg-amber-50' : 'bg-sky-50'}`}>
              <div className="flex items-center gap-2">
                <Brain className={`h-5 w-5 ${aiPreview.urgency === 'critical' ? 'text-brand-600' : aiPreview.urgency === 'high' ? 'text-amber-600' : 'text-sky-600'}`} />
                <p className="text-sm font-semibold text-slate-900">AI Priority Classification</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Auto-classified urgency</p>
                  <UrgencyBadge urgency={aiPreview.urgency} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Priority Score</p>
                  <p className="text-2xl font-bold text-slate-900">{aiPreview.score}<span className="text-sm">/100</span></p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Based on urgency level, required date proximity, and quantity requested. This helps route the most critical needs first.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Your Account"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteConfirm !== 'delete' || deleting} loading={deleting}>
              Permanently Delete Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you absolutely sure you want to delete your account? This action will permanently erase your profile, hospital details, donation requests, and all other related records.
          </p>
          <div className="rounded-lg bg-brand-50 p-4 text-xs text-brand-700">
            <strong>Warning:</strong> This process is completely irreversible.
          </div>
          <Input
            label='Type "delete" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type delete"
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function Phone2() { return <span className="text-[10px]">☎</span>; }

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{value || '—'}</p>
    </div>
  );
}
