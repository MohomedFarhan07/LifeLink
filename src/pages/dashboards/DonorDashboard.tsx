import { useState, useEffect, useCallback } from 'react';
import { Droplet, Heart, Activity, Building2, Calendar, MapPin, Phone, User, Edit3, Check, X, Clock, TrendingUp, Award, Bell, Inbox, MessageSquare } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { ChatPanel } from '../../components/dashboard/ChatPanel';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from '../../components/shared/Badges';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { Donor, BloodRequest, Donation, Hospital, BloodGroup, Profile } from '../../types';
import { formatDate, BLOOD_GROUPS, compatibleDonorGroups, daysUntil } from '../../lib/utils';
import { sendNotification } from '../../lib/notifications';
import { CampaignFinder, ConnectionRequests, Connections } from '../../components/dashboard/ApprovedConnections';

type Tab = 'overview' | 'requests' | 'inbox' | 'history' | 'hospitals' | 'profile' | 'campaigns' | 'bank_requests' | 'connections';

export function DonorDashboard() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [donor, setDonor] = useState<Donor | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Donor>>({});
  const [incomingRequests, setIncomingRequests] = useState<Donation[]>([]);
  const [hospitalProfiles, setHospitalProfiles] = useState<Record<string, Profile>>({});
  const [activeChat, setActiveChat] = useState<Donation | null>(null);
  const [openConnectionId, setOpenConnectionId] = useState<string | null>(null);
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

  const loadData = useCallback(async () => {
    if (!profile) return;
    const { data: d } = await supabase.from('donors').select('*').eq('user_id', profile.id).maybeSingle();
    setDonor(d as Donor | null);
    setEditForm(d || {});

    const compatible = d ? compatibleDonorGroups(d.blood_group as BloodGroup) : [];
    const { data: reqs } = await supabase
      .from('blood_requests')
      .select('*')
      .in('blood_group', compatible.length ? compatible : BLOOD_GROUPS)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    setRequests((reqs as BloodRequest[]) || []);

    const { data: dons } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', profile.id)
      .order('created_at', { ascending: false });
    setDonations((dons as Donation[]) || []);

    const { data: hosp } = await supabase.from('hospitals').select('*').eq('verification_status', 'verified').limit(20);
    setHospitals((hosp as Hospital[]) || []);

    const { data: incoming } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', profile.id)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });
    const incomingDons = (incoming as Donation[]) || [];
    setIncomingRequests(incomingDons);

    const hospitalIds = [...new Set(incomingDons.map((d) => d.hospital_id))];
    if (hospitalIds.length > 0) {
      const { data: hospProfiles } = await supabase.from('profiles').select('*').in('id', hospitalIds);
      const map: Record<string, Profile> = {};
      (hospProfiles as Profile[] || []).forEach((p) => { map[p.id] = p; });
      setHospitalProfiles(map);
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAvailability = async () => {
    if (!donor) return;
    const next = donor.availability_status === 'available' ? 'unavailable' : 'available';
    await supabase.from('donors').update({ availability_status: next }).eq('id', donor.id);
    setDonor({ ...donor, availability_status: next });
    toast(`You are now ${next === 'available' ? 'available' : 'unavailable'} for donations.`);
  };

  const respondToRequest = async (req: BloodRequest, accept: boolean) => {
    if (!profile || !donor) return;
    if (accept) {
      await supabase.from('donations').insert({
        request_id: req.id,
        donor_id: profile.id,
        hospital_id: req.hospital_id,
        blood_group: req.blood_group,
        status: 'accepted',
        donation_date: new Date().toISOString().split('T')[0],
      });
      await supabase.from('blood_requests').update({ status: 'matched' }).eq('id', req.id);
      await sendNotification(req.hospital_id, 'match', 'Donor accepted your request', `A compatible donor (${profile.full_name}) accepted your ${req.blood_group} blood request.`, '/dashboard');
      toast('Request accepted! The hospital will contact you.');
    } else {
      toast('Request declined.');
    }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const respondToIncoming = async (don: Donation, accept: boolean) => {
    if (!profile) return;
    if (accept) {
      await supabase.from('donations').update({ status: 'accepted', donation_date: new Date().toISOString().split('T')[0] }).eq('id', don.id);
      await sendNotification(don.hospital_id, 'match', 'Donor accepted your request', `A donor (${profile.full_name}) accepted your ${don.blood_group} blood donation request. You can now chat to coordinate.`, '/dashboard');
      toast('Request accepted! You can now chat with the hospital.');
      setActiveChat({ ...don, status: 'accepted' });
    } else {
      await supabase.from('donations').update({ status: 'rejected' }).eq('id', don.id);
      toast('Request declined.');
    }
    setIncomingRequests((prev) => prev.map((d) => (d.id === don.id ? { ...d, status: accept ? 'accepted' : 'rejected' } : d)));
  };

  const completeDonation = async (don: Donation) => {
    await supabase.from('donations').update({ status: 'completed' }).eq('id', don.id);
    if (profile) {
      await supabase.from('donors').update({ last_donation_date: new Date().toISOString().split('T')[0] }).eq('user_id', profile.id);
    }
    setDonations((prev) => prev.map((d) => (d.id === don.id ? { ...d, status: 'completed' } : d)));
    toast('Donation marked as completed. Thank you for saving lives!');
    loadData();
  };

  const saveProfile = async () => {
    if (!donor) return;
    await supabase.from('donors').update({
      nic_number: editForm.nic_number,
      date_of_birth: editForm.date_of_birth,
      gender: editForm.gender,
      blood_group: editForm.blood_group,
      emergency_contact: editForm.emergency_contact,
      medical_history: editForm.medical_history,
      organ_donation_preference: editForm.organ_donation_preference,
    }).eq('id', donor.id);
    setDonor({ ...donor, ...editForm } as Donor);
    setEditOpen(false);
    toast('Profile updated successfully.');
    loadData();
  };

  if (loading) return <DashboardLayout><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></DashboardLayout>;

  const completedDonations = donations.filter((d) => d.status === 'completed');
  const eligible = donor?.last_donation_date ? daysUntil(donor.last_donation_date) <= -56 : true;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Calendar className="h-4 w-4" /> },
    { id: 'bank_requests', label: 'Bank Requests', icon: <Inbox className="h-4 w-4" /> },
    { id: 'connections', label: 'My Connections', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'history', label: 'Donation History', icon: <Clock className="h-4 w-4" /> },
    { id: 'profile', label: 'My Profile', icon: <User className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name?.split(' ')[0]}</h2>
          <p className="mt-1 text-sm text-slate-500">Thank you for being a lifesaver. {donor?.availability_status === 'available' ? 'You are available for donations.' : 'You are currently unavailable.'}</p>
        </div>
        {donor && (
          <div className="flex items-center gap-3">
            <BloodGroupBadge group={donor.blood_group} />
            <Button variant={donor.availability_status === 'available' ? 'success' : 'outline'} onClick={toggleAvailability} icon={<Activity className="h-4 w-4" />}>
              {donor.availability_status === 'available' ? 'Available' : 'Unavailable'}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'connections') setOpenConnectionId(null);
            }}
            className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge ? (
              <span className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${tab === t.id ? 'bg-white text-brand-600' : 'bg-brand-600 text-white'}`}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Donations Completed" value={completedDonations.length} icon={<Heart className="h-5 w-5" />} accent="brand" />
            <StatCard label="Lives Impacted" value={completedDonations.length * 3} icon={<Award className="h-5 w-5" />} accent="emerald" />
            <StatCard label="Active Requests" value={requests.length} icon={<Bell className="h-5 w-5" />} accent="amber" />
            <StatCard label="Eligibility" value={eligible ? 'Eligible' : 'Waiting'} icon={<Droplet className="h-5 w-5" />} accent="sky" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Donation Campaigns" subtitle="Join blood-donation campaigns near you" icon={<Calendar className="h-5 w-5" />} />
              <div className="p-5">
                {requests.length === 0 ? (
                  <EmptyState icon={<Calendar className="h-6 w-6" />} title="Find a campaign" description="Search available blood-donation campaigns and register to participate." action={<Button onClick={() => setTab('campaigns')}>Browse Campaigns</Button>} />
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 4).map((req) => (
                      <div key={req.id} className="flex items-center gap-4 rounded-lg border border-slate-100 p-4">
                        <BloodGroupBadge group={req.blood_group} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{req.hospital_name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location} · {req.quantity_units} units</p>
                        </div>
                        <UrgencyBadge urgency={req.patient_urgency} />
                        <Button size="sm" onClick={() => setTab('campaigns')} icon={<Calendar className="h-4 w-4" />}>Browse Campaigns</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Your Status" icon={<Activity className="h-5 w-5" />} />
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Blood Group</span>
                  <BloodGroupBadge group={donor?.blood_group || 'O+'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Availability</span>
                  <Badge variant={donor?.availability_status === 'available' ? 'success' : 'neutral'} dot>
                    {donor?.availability_status === 'available' ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Last Donation</span>
                  <span className="text-sm font-medium text-slate-900">{formatDate(donor?.last_donation_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Organ Donor</span>
                  <Badge variant={donor?.organ_donation_preference ? 'brand' : 'neutral'}>
                    {donor?.organ_donation_preference ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {!eligible && donor?.last_donation_date && (
                  <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                    You can donate again in {Math.abs(daysUntil(donor.last_donation_date) + 56)} days (56-day minimum interval).
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Requests */}
      {tab === 'requests' && (
        <Card>
          <CardHeader title="Emergency Blood Requests" subtitle="Compatible with your blood group — accept to help save a life" icon={<Bell className="h-5 w-5" />} />
          <div className="p-5">
            {requests.length === 0 ? (
              <EmptyState icon={<Bell className="h-6 w-6" />} title="No active requests" description="When hospitals create emergency requests matching your blood group, they will appear here." />
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-slate-200 p-4 transition-colors hover:border-brand-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <BloodGroupBadge group={req.blood_group} size="lg" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{req.hospital_name}</p>
                          <UrgencyBadge urgency={req.patient_urgency} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.location}</span>
                          <span className="flex items-center gap-1"><Droplet className="h-3 w-3" /> {req.quantity_units} units needed</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Required by {formatDate(req.required_date)}</span>
                        </div>
                        {req.notes && <p className="mt-2 text-sm text-slate-600">{req.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="success" onClick={() => respondToRequest(req, true)} icon={<Check className="h-4 w-4" />}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => respondToRequest(req, false)} icon={<X className="h-4 w-4" />}>Decline</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Inbox — incoming donation requests from hospitals */}
      {tab === 'inbox' && (
        <div className="space-y-6">
          {activeChat && profile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => setActiveChat(null)} icon={<Inbox className="h-4 w-4" />}>Back to Inbox</Button>
                <Badge variant="success">Chat active</Badge>
              </div>
              <ChatPanel
                donationId={activeChat.id}
                currentUserId={profile.id}
                recipientId={activeChat.hospital_id}
                recipientName={hospitalProfiles[activeChat.hospital_id]?.full_name || 'Hospital'}
                recipientSubtitle={`${activeChat.blood_group} · ${formatDate(activeChat.donation_date)}`}
              />
              <Card>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Donation coordinated?</p>
                    <p className="text-xs text-slate-500">Mark this donation as completed once finished.</p>
                  </div>
                  <Button size="sm" onClick={() => { completeDonation(activeChat); setActiveChat(null); }} icon={<Check className="h-4 w-4" />}>Mark Completed</Button>
                </div>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader
                title="Inbox"
                subtitle="Donation requests from hospitals"
                icon={<Inbox className="h-5 w-5" />}
              />
              <div className="p-5">
                {incomingRequests.length === 0 ? (
                  <EmptyState icon={<Inbox className="h-6 w-6" />} title="No requests" description="When a hospital sends you a donation request, it will appear here." />
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((don) => {
                      const hosp = hospitalProfiles[don.hospital_id];
                      return (
                        <div key={don.id} className="rounded-lg border border-slate-200 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <BloodGroupBadge group={don.blood_group} size="lg" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">{hosp?.full_name || 'Hospital'}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(don.donation_date)}</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Received {formatDate(don.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {don.status === 'pending' ? (
                                <>
                                  <Button size="sm" onClick={() => respondToIncoming(don, true)} icon={<Check className="h-4 w-4" />}>Accept</Button>
                                  <Button size="sm" variant="ghost" onClick={() => respondToIncoming(don, false)} icon={<X className="h-4 w-4" />}>Decline</Button>
                                </>
                              ) : don.status === 'accepted' ? (
                                <>
                                  <Badge variant="success">Accepted</Badge>
                                  <Button size="sm" variant="outline" onClick={() => setActiveChat(don)} icon={<MessageSquare className="h-4 w-4" />}>Chat</Button>
                                </>
                              ) : (
                                <Badge variant="neutral">{don.status}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <Card>
          <CardHeader title="Donation History" subtitle="Your complete donation record" icon={<Clock className="h-5 w-5" />} />
          <div className="p-5">
            {donations.length === 0 ? (
              <EmptyState icon={<Clock className="h-6 w-6" />} title="No donations yet" description="Your donation history will appear here once you accept and complete a request." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-4">Blood Group</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Notes</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50">
                        <td className="py-3 pr-4"><BloodGroupBadge group={d.blood_group} size="sm" /></td>
                        <td className="py-3 pr-4 text-slate-600">{formatDate(d.donation_date)}</td>
                        <td className="py-3 pr-4"><StatusBadge status={d.status} /></td>
                        <td className="py-3 pr-4 text-slate-500 max-w-xs truncate">{d.notes || '—'}</td>
                        <td className="py-3">
                          {d.status === 'accepted' && (
                            <Button size="sm" variant="success" onClick={() => completeDonation(d)} icon={<Check className="h-4 w-4" />}>Mark Completed</Button>
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

      {/* Hospitals */}
      {tab === 'hospitals' && (
        <Card>
          <CardHeader title="Nearby Hospitals" subtitle="Verified hospitals in the LifeLink network" icon={<Building2 className="h-5 w-5" />} />
          <div className="p-5">
            {hospitals.length === 0 ? (
              <EmptyState icon={<Building2 className="h-6 w-6" />} title="No hospitals found" description="Verified hospitals will appear here." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {hospitals.map((h) => (
                  <div key={h.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{h.hospital_name}</p>
                          <Badge variant="success" dot>Verified</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {h.location}</p>
                      <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {h.contact_number || '—'}</p>
                      <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {h.hospital_type} hospital</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Profile */}
      {tab === 'campaigns' && profile && <CampaignFinder profile={profile} />}
      {tab === 'bank_requests' && profile && <ConnectionRequests profile={profile} onAccepted={(connection) => { setOpenConnectionId(connection.id); setTab('connections'); }} />}
      {tab === 'connections' && profile && <Connections profile={profile} openConnectionId={openConnectionId} />}

      {tab === 'profile' && donor && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Donor Profile" subtitle="Your medical and contact information" icon={<User className="h-5 w-5" />} action={<Button size="sm" variant="outline" onClick={() => { setEditForm(donor); setEditOpen(true); }} icon={<Edit3 className="h-4 w-4" />}>Edit</Button>} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Full Name" value={profile?.full_name || '—'} />
              <Field label="Email" value={profile?.email || '—'} />
              <Field label="Phone" value={profile?.phone || '—'} />
              <Field label="NIC / ID" value={donor.nic_number || '—'} />
              <Field label="Date of Birth" value={formatDate(donor.date_of_birth)} />
              <Field label="Gender" value={donor.gender} />
              <Field label="Blood Group" value={donor.blood_group} />
              <Field label="Emergency Contact" value={donor.emergency_contact || '—'} />
              <Field label="Organ Donation" value={donor.organ_donation_preference ? 'Yes' : 'No'} />
              <Field label="Availability" value={donor.availability_status} />
              <div className="sm:col-span-2">
                <Field label="Medical History" value={donor.medical_history || 'No known conditions'} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Account Info" icon={<User className="h-5 w-5" />} />
            <div className="space-y-4 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
                  {profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-xs text-slate-500">Donor since {formatDate(profile?.created_at)}</p>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">City</span>
                  <span className="font-medium text-slate-900">{profile?.city || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Member since</span>
                  <span className="font-medium text-slate-900">{formatDate(profile?.created_at)}</span>
                </div>
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

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Donor Profile"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveProfile} icon={<Check className="h-4 w-4" />}>Save Changes</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="NIC / ID Number" value={editForm.nic_number || ''} onChange={(e) => setEditForm({ ...editForm, nic_number: e.target.value })} />
          <Input label="Date of Birth" type="date" value={editForm.date_of_birth || ''} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
          <Select label="Gender" value={editForm.gender || 'male'} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as Donor['gender'] })}>
            <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </Select>
          <Select label="Blood Group" value={editForm.blood_group || 'O+'} onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value as BloodGroup })}>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Input label="Emergency Contact" value={editForm.emergency_contact || ''} onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })} />
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-700">
              <input type="checkbox" checked={editForm.organ_donation_preference || false} onChange={(e) => setEditForm({ ...editForm, organ_donation_preference: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              Willing to donate organs
            </label>
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Medical History" rows={3} value={editForm.medical_history || ''} onChange={(e) => setEditForm({ ...editForm, medical_history: e.target.value })} />
          </div>
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
            Are you absolutely sure you want to delete your account? This action will permanently erase your profile, medical history, donation history, and all other related records.
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900 capitalize">{value}</p>
    </div>
  );
}
