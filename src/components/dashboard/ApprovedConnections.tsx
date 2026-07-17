import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, HeartHandshake, MapPin, MessageSquare, Search, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BloodBank, BloodGroup, Campaign, CampaignParticipant, Connection, ConnectionMessage, ConnectionRequest, Donor, Profile } from '../../types';
import { BLOOD_GROUPS, formatDate } from '../../lib/utils';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { BloodGroupBadge } from '../shared/Badges';
import { useToast } from '../ui/Toast';

function ConnectionChat({ connection, currentUser, recipient }: { connection: Connection; currentUser: Profile; recipient: Profile }) {
  const [messages, setMessages] = useState<ConnectionMessage[]>([]);
  const [text, setText] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from('connection_messages').select('*').eq('connection_id', connection.id).order('created_at');
    setMessages((data as ConnectionMessage[]) || []);
  }, [connection.id]);
  useEffect(() => {
    void load();
    const channel = supabase.channel(`connection:${connection.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_messages', filter: `connection_id=eq.${connection.id}` }, ({ new: row }) => {
      const message = row as ConnectionMessage;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [connection.id, load]);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await supabase.from('connection_messages').insert({ connection_id: connection.id, sender_id: currentUser.id, recipient_id: recipient.id, body });
  };
  return <Card className="overflow-hidden"><CardHeader title={`Chat with ${recipient.full_name}`} subtitle={connection.kind === 'bank_donor' ? 'Approved blood-donation connection' : 'Approved blood-transfer connection'} icon={<MessageSquare className="h-5 w-5" />} /><div className="h-80 space-y-3 overflow-y-auto p-4">{messages.length === 0 ? <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="Start the conversation" description="This private chat became available after the request was accepted." /> : messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[76%] rounded-2xl px-3 py-2 text-sm ${message.sender_id === currentUser.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{message.body}</div></div>)}</div><div className="flex gap-2 border-t border-slate-100 p-3"><input className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void send(); }} placeholder="Write a message..." /><Button size="sm" onClick={() => void send()} disabled={!text.trim()} icon={<Send className="h-4 w-4" />}>Send</Button></div></Card>;
}

export function ConnectionRequests({ profile, onAccepted }: { profile: Profile; onAccepted?: (connection: Connection) => void }) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from('connection_requests').select('*').eq('recipient_id', profile.id).eq('status', 'pending').order('created_at', { ascending: false });
    const items = (data as ConnectionRequest[]) || []; setRequests(items);
    const ids = [...new Set(items.map((item) => item.requester_id))];
    if (ids.length) { const { data: people } = await supabase.from('profiles').select('*').in('id', ids); setProfiles(Object.fromEntries(((people as Profile[]) || []).map((person) => [person.id, person]))); }
  }, [profile.id]);
  useEffect(() => { void load(); const channel = supabase.channel(`request-inbox:${profile.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connection_requests', filter: `recipient_id=eq.${profile.id}` }, () => { void load(); }).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [load, profile.id]);
  const respond = async (request: ConnectionRequest, status: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('connection_requests').update({ status }).eq('id', request.id);
    if (error) return;
    setRequests((current) => current.filter((item) => item.id !== request.id));
    if (status === 'accepted') {
      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .eq('kind', request.kind)
        .or(`participant_one.eq.${profile.id},participant_two.eq.${profile.id}`);
      const connection = (connections as Connection[] | null)?.find((item) =>
        (item.participant_one === profile.id && item.participant_two === request.requester_id) ||
        (item.participant_one === request.requester_id && item.participant_two === profile.id)
      );
      if (connection) onAccepted?.(connection as Connection);
    }
  };
  return <Card><CardHeader title="Connection Requests" subtitle="Accept a request to unlock a private real-time chat." icon={<HeartHandshake className="h-5 w-5" />} /><div className="space-y-3 p-5">{requests.length === 0 ? <EmptyState icon={<HeartHandshake className="h-6 w-6" />} title="No pending requests" description="New approved-connection requests will appear here." /> : requests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><BloodGroupBadge group={request.blood_group} /><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{profiles[request.requester_id]?.full_name || 'Connection request'}</p><p className="mt-1 text-xs text-slate-500">{request.units} unit(s) · {request.message || 'No additional message'}</p></div><div className="flex gap-2"><Button size="sm" variant="success" onClick={() => void respond(request, 'accepted')} icon={<Check className="h-4 w-4" />}>Accept</Button><Button size="sm" variant="outline" onClick={() => void respond(request, 'rejected')} icon={<X className="h-4 w-4" />}>Decline</Button></div></div>)}</div></Card>;
}

export function Connections({ profile, openConnectionId }: { profile: Profile; openConnectionId?: string | null }) {
  const [connections, setConnections] = useState<Connection[]>([]); const [people, setPeople] = useState<Record<string, Profile>>({}); const [active, setActive] = useState<Connection | null>(null);
  const load = useCallback(async () => { const { data } = await supabase.from('connections').select('*').or(`participant_one.eq.${profile.id},participant_two.eq.${profile.id}`).order('created_at', { ascending: false }); const items = (data as Connection[]) || []; setConnections(items); const ids = [...new Set(items.map((item) => item.participant_one === profile.id ? item.participant_two : item.participant_one))]; if (ids.length) { const { data: rows } = await supabase.from('profiles').select('*').in('id', ids); setPeople(Object.fromEntries(((rows as Profile[]) || []).map((person) => [person.id, person]))); } }, [profile.id]);
  useEffect(() => { void load(); const channel = supabase.channel(`connections:${profile.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections' }, () => { void load(); }).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [load, profile.id]);
  useEffect(() => {
    if (!openConnectionId) return;
    const connection = connections.find((item) => item.id === openConnectionId);
    if (connection) setActive(connection);
  }, [connections, openConnectionId]);
  useEffect(() => {
    const seen = new Set<string>();
    const unique = connections.filter((connection) => {
      const pair = [connection.participant_one, connection.participant_two].sort().join(':');
      const key = `${connection.kind}:${pair}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length !== connections.length) setConnections(unique);
  }, [connections]);
  if (active) { const recipientId = active.participant_one === profile.id ? active.participant_two : active.participant_one; const recipient = people[recipientId]; return <div className="space-y-3"><Button size="sm" variant="outline" onClick={() => setActive(null)}>Back to connections</Button>{recipient && <ConnectionChat connection={active} currentUser={profile} recipient={recipient} />}</div>; }
  return <Card><CardHeader title="Approved Connections" subtitle="Only accepted requests can open a chat." icon={<MessageSquare className="h-5 w-5" />} /><div className="space-y-3 p-5">{connections.length === 0 ? <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No active connections" description="Accept a request to unlock secure real-time chat." /> : connections.map((connection) => { const id = connection.participant_one === profile.id ? connection.participant_two : connection.participant_one; return <div key={connection.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">{people[id]?.full_name?.slice(0, 1) || '?'}</div><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{people[id]?.full_name || 'Connection'}</p><p className="text-xs text-slate-500">{connection.kind === 'bank_donor' ? 'Blood Bank ↔ Donor' : 'Hospital ↔ Blood Bank'}</p></div><Button size="sm" onClick={() => setActive(connection)} icon={<MessageSquare className="h-4 w-4" />}>Chat</Button></div>; })}</div></Card>;
}

export function CampaignFinder({ profile }: { profile: Profile }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [joined, setJoined] = useState<Set<string>>(new Set()); const [query, setQuery] = useState('');
  useEffect(() => { (async () => { const [{ data: campaignRows }, { data: participantRows }] = await Promise.all([supabase.from('campaigns').select('*').in('status', ['upcoming', 'active']).order('event_date'), supabase.from('campaign_participants').select('campaign_id').eq('donor_id', profile.id)]); setCampaigns((campaignRows as Campaign[]) || []); setJoined(new Set(((participantRows as Pick<CampaignParticipant, 'campaign_id'>[]) || []).map((item) => item.campaign_id))); })(); }, [profile.id]);
  const visible = useMemo(() => { const term = query.trim().toLowerCase(); return campaigns.filter((campaign) => !term || [campaign.title, campaign.description, campaign.location].join(' ').toLowerCase().includes(term)); }, [campaigns, query]);
  const join = async (campaign: Campaign) => { const { error } = await supabase.from('campaign_participants').insert({ campaign_id: campaign.id, donor_id: profile.id }); if (!error) setJoined((current) => new Set(current).add(campaign.id)); };
  return <Card><CardHeader title="Find Donation Campaigns" subtitle="Search local campaigns and register to participate." icon={<Search className="h-5 w-5" />} /><div className="p-5"><Input icon={<Search className="h-4 w-4" />} placeholder="Search campaigns by name or location..." value={query} onChange={(event) => setQuery(event.target.value)} /><div className="mt-5 grid gap-4 md:grid-cols-2">{visible.map((campaign) => <div key={campaign.id} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">{campaign.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.description}</p><p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{campaign.location} · {formatDate(campaign.event_date)}</p><Button size="sm" className="mt-4" variant={joined.has(campaign.id) ? 'success' : 'primary'} disabled={joined.has(campaign.id)} onClick={() => void join(campaign)}>{joined.has(campaign.id) ? 'Registered' : 'Participate'}</Button></div>)}</div>{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No campaigns found" description="Try another location or keyword." />}</div></Card>;
}

export function BankDonorFinder({ profile }: { profile: Profile }) {
  const [donors, setDonors] = useState<(Donor & { profiles?: Profile })[]>([]); const [requestedDonorIds, setRequestedDonorIds] = useState<Set<string>>(new Set()); const [query, setQuery] = useState(''); const [group, setGroup] = useState<BloodGroup>('O+');
  const { toast } = useToast();
  useEffect(() => { (async () => {
    const [{ data: donorRows }, { data: requestRows }] = await Promise.all([
      supabase.from('donors').select('*, profiles(*)').eq('availability_status', 'available').eq('blood_group', group),
      supabase.from('connection_requests').select('recipient_id').eq('kind', 'bank_donor').eq('requester_id', profile.id).in('status', ['pending', 'accepted']),
    ]);
    setDonors((donorRows as (Donor & { profiles?: Profile })[]) || []);
    setRequestedDonorIds(new Set(((requestRows as { recipient_id: string }[]) || []).map((request) => request.recipient_id)));
  })(); }, [group, profile.id]);
  const send = async (donor: Donor & { profiles?: Profile }) => {
    const { error } = await supabase.from('connection_requests').insert({ kind: 'bank_donor', requester_id: profile.id, recipient_id: donor.user_id, blood_group: donor.blood_group, units: 1, message: 'Your blood group matches our current blood requirement.' });
    if (error) toast(error.code === '23505' ? 'A request to this donor is already pending.' : `Could not send the request: ${error.message}`, 'error');
    else { setRequestedDonorIds((current) => new Set(current).add(donor.user_id)); toast(`Request sent to ${donor.profiles?.full_name || 'the donor'}. You can chat after they accept.`); }
  };
  const visible = donors.filter((donor) => [donor.profiles?.full_name, donor.profiles?.city].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <Card><CardHeader title="Find Matched Donors" subtitle="Send a request; chat opens only after the donor accepts." icon={<Search className="h-5 w-5" />} /><div className="p-5"><div className="grid gap-3 sm:grid-cols-2"><Select label="Required blood group" value={group} onChange={(event) => setGroup(event.target.value as BloodGroup)}>{BLOOD_GROUPS.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Search donor or city" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="mt-5 space-y-3">{visible.map((donor) => { const requested = requestedDonorIds.has(donor.user_id); return <div key={donor.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><BloodGroupBadge group={donor.blood_group} /><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{donor.profiles?.full_name || 'Donor'}</p><p className="text-xs text-slate-500">{donor.profiles?.city || 'Location not provided'}</p></div><Button size="sm" disabled={requested} variant={requested ? 'outline' : 'primary'} onClick={() => void send(donor)} icon={<Send className="h-4 w-4" />}>{requested ? 'Request sent' : 'Request Blood'}</Button></div>; })}{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No available donors" description="Try another blood group or location." />}</div></div></Card>;
}

export function HospitalBankFinder({ profile }: { profile: Profile }) {
  const [banks, setBanks] = useState<BloodBank[]>([]); const [query, setQuery] = useState(''); const [group, setGroup] = useState<BloodGroup>('O+');
  useEffect(() => { (async () => { const { data } = await supabase.from('blood_banks').select('*').eq('verification_status', 'verified'); setBanks((data as BloodBank[]) || []); })(); }, []);
  const send = async (bank: BloodBank) => { await supabase.from('connection_requests').insert({ kind: 'hospital_bank', requester_id: profile.id, recipient_id: bank.user_id, blood_group: group, units: 1, message: `Our hospital needs ${group} blood. Please review this request.` }); };
  const visible = banks.filter((bank) => [bank.bank_name, bank.location].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <Card><CardHeader title="Find Matched Blood Banks" subtitle="Search verified banks and request blood; chat opens after approval." icon={<Search className="h-5 w-5" />} /><div className="p-5"><div className="grid gap-3 sm:grid-cols-2"><Select label="Required blood group" value={group} onChange={(event) => setGroup(event.target.value as BloodGroup)}>{BLOOD_GROUPS.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Search blood bank or location" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="mt-5 space-y-3">{visible.map((bank) => <div key={bank.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">B</div><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{bank.bank_name}</p><p className="text-xs text-slate-500">{bank.location}</p></div><Button size="sm" onClick={() => void send(bank)} icon={<Send className="h-4 w-4" />}>Request Blood</Button></div>)}{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No blood banks found" description="Try another location." />}</div></div></Card>;
}
