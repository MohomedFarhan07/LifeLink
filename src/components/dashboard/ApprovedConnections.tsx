import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, HeartHandshake, MapPin, MessageSquare, Search, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BloodBank, BloodGroup, BloodInventory, BloodTransfer, Campaign, CampaignParticipant, Connection, ConnectionMessage, ConnectionRequest, Donor, Profile } from '../../types';
import { BLOOD_GROUPS, formatDate } from '../../lib/utils';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { BloodGroupBadge } from '../shared/Badges';
import { useToast } from '../ui/Toast';
import { PublicProfileLink } from '../shared/PublicProfileLink';

function ConnectionChat({ connection, currentUser, recipient }: { connection: Connection; currentUser: Profile; recipient: Profile }) {
  const [messages, setMessages] = useState<ConnectionMessage[]>([]);
  const [text, setText] = useState('');
  const [donationCompleted, setDonationCompleted] = useState(false);
  const [completingDonation, setCompletingDonation] = useState(false);
  const { toast } = useToast();
  const canCompleteDonation = connection.kind === 'bank_donor' && currentUser.role === 'blood_bank' && recipient.role === 'donor';
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
  useEffect(() => {
    if (!canCompleteDonation) return;
    void (async () => {
      const { data } = await supabase.from('donations').select('id').eq('donor_id', recipient.id).eq('hospital_id', currentUser.id).eq('notes', `Bank connection ${connection.id}`).eq('status', 'completed').maybeSingle();
      setDonationCompleted(!!data);
    })();
  }, [canCompleteDonation, connection.id, currentUser.id, recipient.id]);
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await supabase.from('connection_messages').insert({ connection_id: connection.id, sender_id: currentUser.id, recipient_id: recipient.id, body });
  };
  const completeDonation = async () => {
    if (!canCompleteDonation || donationCompleted) return;
    setCompletingDonation(true);
    const { data: request, error: requestError } = await supabase.from('connection_requests').select('blood_group').eq('id', connection.request_id).maybeSingle();
    if (requestError || !request) { toast('Could not find the donation request.', 'error'); setCompletingDonation(false); return; }
    const { error } = await supabase.from('donations').insert({ donor_id: recipient.id, hospital_id: currentUser.id, blood_group: request.blood_group, donation_date: new Date().toISOString().slice(0, 10), status: 'completed', notes: `Bank connection ${connection.id}` });
    if (error) toast(`Could not record the donation: ${error.message}`, 'error');
    else { setDonationCompleted(true); toast(`Donation for ${recipient.full_name} recorded as completed.`); }
    setCompletingDonation(false);
  };
  return <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-700">
    <CardHeader title={`Chat with ${recipient.full_name}`} subtitle={connection.kind === 'bank_donor' ? 'Approved blood-donation connection' : 'Approved blood-transfer connection'} icon={<MessageSquare className="h-5 w-5" />} action={canCompleteDonation ? <Button size="sm" variant={donationCompleted ? 'success' : 'primary'} disabled={donationCompleted || completingDonation} loading={completingDonation} onClick={() => void completeDonation()} icon={<Check className="h-4 w-4" />}>{donationCompleted ? 'Donation completed' : 'Mark donation completed'}</Button> : undefined} />
    <div className="h-96 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-900 dark:to-slate-950">
      {messages.length === 0 ? <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="Start the conversation" description="This private chat became available after the request was accepted." /> : messages.map((message) => {
        const mine = message.sender_id === currentUser.id;
        return <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
          {!mine && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">{recipient.full_name.slice(0, 1).toUpperCase()}</div>}
          <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
            {!mine && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{recipient.full_name}</p>}
            <p className="break-words">{message.body}</p>
            <p className={`mt-1 text-right text-[10px] ${mine ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>;
      })}
    </div>
    <div className="flex gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <input className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900" value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void send(); }} placeholder="Write a message..." />
      <Button size="sm" onClick={() => void send()} disabled={!text.trim()} icon={<Send className="h-4 w-4" />}>Send</Button>
    </div>
  </Card>;
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
  return <Card><CardHeader title="Connection Requests" subtitle="Accept a request to unlock a private real-time chat." icon={<HeartHandshake className="h-5 w-5" />} /><div className="space-y-3 p-5">{requests.length === 0 ? <EmptyState icon={<HeartHandshake className="h-6 w-6" />} title="No pending requests" description="New approved-connection requests will appear here." /> : requests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><BloodGroupBadge group={request.blood_group} /><div className="flex-1"><PublicProfileLink userId={request.requester_id} role={profiles[request.requester_id]?.role} label={profiles[request.requester_id]?.full_name || 'Connection request'} className="text-sm font-semibold text-slate-900" /><p className="mt-1 text-xs text-slate-500">{request.units} unit(s) · {request.message || 'No additional message'}</p></div><div className="flex gap-2"><Button size="sm" variant="success" onClick={() => void respond(request, 'accepted')} icon={<Check className="h-4 w-4" />}>Accept</Button><Button size="sm" variant="outline" onClick={() => void respond(request, 'rejected')} icon={<X className="h-4 w-4" />}>Decline</Button></div></div>)}</div></Card>;
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
  return <Card><CardHeader title="Approved Connections" subtitle="Only accepted requests can open a chat." icon={<MessageSquare className="h-5 w-5" />} /><div className="space-y-3 p-5">{connections.length === 0 ? <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No active connections" description="Accept a request to unlock secure real-time chat." /> : connections.map((connection) => { const id = connection.participant_one === profile.id ? connection.participant_two : connection.participant_one; return <div key={connection.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">{people[id]?.full_name?.slice(0, 1) || '?'}</div><div className="flex-1"><PublicProfileLink userId={id} role={people[id]?.role} label={people[id]?.full_name || 'Connection'} className="text-sm font-semibold text-slate-900" /><p className="text-xs text-slate-500">{connection.kind === 'bank_donor' ? 'Blood Bank ↔ Donor' : 'Hospital ↔ Blood Bank'}</p></div><Button size="sm" onClick={() => setActive(connection)} icon={<MessageSquare className="h-4 w-4" />}>Chat</Button></div>; })}</div></Card>;
}

export function CampaignFinder({ profile }: { profile: Profile }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: campaignRows }, { data: participantRows }] = await Promise.all([
        supabase.from('campaigns').select('*').in('status', ['upcoming', 'active']).order('event_date'),
        supabase.from('campaign_participants').select('campaign_id').eq('donor_id', profile.id),
      ]);
      setCampaigns((campaignRows as Campaign[]) || []);
      setJoined(new Set(((participantRows as Pick<CampaignParticipant, 'campaign_id'>[]) || []).map((item) => item.campaign_id)));
    })();
  }, [profile.id]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return campaigns.filter((campaign) => !term || [campaign.title, campaign.description, campaign.location].join(' ').toLowerCase().includes(term));
  }, [campaigns, query]);

  const join = async (campaign: Campaign) => {
    const { error } = await supabase.from('campaign_participants').insert({ campaign_id: campaign.id, donor_id: profile.id });
    if (!error) setJoined((current) => new Set(current).add(campaign.id));
  };

  return <><Card><CardHeader title="Find Donation Campaigns" subtitle="Select a campaign to read its details, then register to participate." icon={<Search className="h-5 w-5" />} /><div className="p-5"><Input icon={<Search className="h-4 w-4" />} placeholder="Search campaigns by name or location..." value={query} onChange={(event) => setQuery(event.target.value)} /><div className="mt-5 grid gap-4 md:grid-cols-2">{visible.map((campaign) => <div key={campaign.id} role="button" tabIndex={0} onClick={() => setSelectedCampaign(campaign)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedCampaign(campaign); }} className="cursor-pointer rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-sm"><p className="text-sm font-semibold text-slate-900">{campaign.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.description}</p><p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{campaign.location} · {formatDate(campaign.event_date)}</p><div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs font-medium text-brand-700">View campaign brief</span><Button size="sm" variant={joined.has(campaign.id) ? 'success' : 'primary'} disabled={joined.has(campaign.id)} onClick={(event) => { event.stopPropagation(); void join(campaign); }}>{joined.has(campaign.id) ? 'Registered' : 'Participate'}</Button></div></div>)}</div>{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No campaigns found" description="Try another location or keyword." />}</div></Card><Modal open={!!selectedCampaign} onClose={() => setSelectedCampaign(null)} title={selectedCampaign?.title || 'Campaign details'} subtitle={selectedCampaign ? `${selectedCampaign.location} · ${formatDate(selectedCampaign.event_date)}` : ''} size="md" footer={<Button onClick={() => setSelectedCampaign(null)}>Close</Button>}>{selectedCampaign && <div className="space-y-4">{selectedCampaign.image_url && <img src={selectedCampaign.image_url} alt="" className="h-44 w-full rounded-xl object-cover" />}<p className="text-sm leading-7 text-slate-700">{selectedCampaign.description}</p><div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900"><p className="font-semibold">Donation goal</p><p className="mt-1">This campaign aims to collect {selectedCampaign.goal_units} unit{selectedCampaign.goal_units === 1 ? '' : 's'} of blood.</p></div></div>}</Modal></>;
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
  return <Card><CardHeader title="Find Matched Donors" subtitle="Send a request; chat opens only after the donor accepts." icon={<Search className="h-5 w-5" />} /><div className="p-5"><div className="grid gap-3 sm:grid-cols-2"><Select label="Required blood group" value={group} onChange={(event) => setGroup(event.target.value as BloodGroup)}>{BLOOD_GROUPS.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Search donor or city" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="mt-5 space-y-3">{visible.map((donor) => { const requested = requestedDonorIds.has(donor.user_id); return <div key={donor.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><BloodGroupBadge group={donor.blood_group} /><div className="flex-1"><PublicProfileLink userId={donor.user_id} role="donor" label={donor.profiles?.full_name || 'Donor'} className="text-sm font-semibold text-slate-900" /><p className="text-xs text-slate-500">{donor.profiles?.city || 'Location not provided'}</p></div><Button size="sm" disabled={requested} variant={requested ? 'outline' : 'primary'} onClick={() => void send(donor)} icon={<Send className="h-4 w-4" />}>{requested ? 'Request sent' : 'Request Blood'}</Button></div>; })}{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No available donors" description="Try another blood group or location." />}</div></div></Card>;
}

export function HospitalTransferFinder({ profile }: { profile: Profile }) {
  const [inventory, setInventory] = useState<(BloodInventory & { bank?: BloodBank })[]>([]);
  const [transfers, setTransfers] = useState<BloodTransfer[]>([]);
  const [group, setGroup] = useState<BloodGroup>('O+');
  const [units, setUnits] = useState(1);
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    const [{ data: inventoryRows }, { data: bankRows }, { data: transferRows }] = await Promise.all([
      supabase.from('blood_inventory').select('*').eq('status', 'available').eq('blood_group', group).gt('units', 0),
      supabase.from('blood_banks').select('*').eq('verification_status', 'verified'),
      supabase.from('blood_transfers').select('*').eq('hospital_id', profile.id).order('created_at', { ascending: false }),
    ]);
    const banks = new Map(((bankRows as BloodBank[]) || []).map((bank) => [bank.user_id, bank]));
    setInventory(((inventoryRows as BloodInventory[]) || []).map((item) => ({ ...item, bank: banks.get(item.bank_id) })).filter((item) => item.bank));
    setTransfers((transferRows as BloodTransfer[]) || []);
  }, [group, profile.id]);

  useEffect(() => { void load(); }, [load]);

  const requestTransfer = async (item: BloodInventory & { bank?: BloodBank }) => {
    if (units < 1 || units > item.units) {
      toast(`Request between 1 and ${item.units} unit(s) from this inventory item.`, 'error');
      return;
    }
    const duplicate = transfers.some((transfer) => transfer.inventory_id === item.id && transfer.status === 'requested');
    if (duplicate) {
      toast('You already have a pending request for this blood inventory item.', 'info');
      return;
    }
    const { data, error } = await supabase.from('blood_transfers').insert({
      inventory_id: item.id,
      bank_id: item.bank_id,
      hospital_id: profile.id,
      blood_group: item.blood_group,
      units,
      notes: `Hospital request for ${units} unit(s) of ${item.blood_group}.`,
    }).select().single();
    if (error) { toast(`Could not send the transfer request: ${error.message}`, 'error'); return; }
    setTransfers((current) => [data as BloodTransfer, ...current]);
    toast(`Transfer request sent to ${item.bank?.bank_name || 'the blood bank'}.`);
  };

  const term = query.trim().toLowerCase();
  const visible = inventory.filter((item) => !term || [item.bank?.bank_name, item.bank?.location, item.blood_group].join(' ').toLowerCase().includes(term));

  return <div className="space-y-6"><Card><CardHeader title="Request Blood From Inventory" subtitle="Choose an available, verified Blood Bank inventory item and submit a transfer request." icon={<Send className="h-5 w-5" />} /><div className="p-5"><div className="grid gap-3 sm:grid-cols-3"><Select label="Blood group" value={group} onChange={(event) => setGroup(event.target.value as BloodGroup)}>{BLOOD_GROUPS.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Units needed" type="number" min="1" value={units} onChange={(event) => setUnits(Math.max(1, Number(event.target.value) || 1))} /><Input label="Search bank or location" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="mt-5 space-y-3">{visible.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><BloodGroupBadge group={item.blood_group} /><div className="flex-1"><PublicProfileLink userId={item.bank_id} role="blood_bank" label={item.bank?.bank_name || 'Blood Bank'} className="text-sm font-semibold text-slate-900" /><p className="text-xs text-slate-500">{item.bank?.location} · {item.units} unit(s) available</p></div><Button size="sm" disabled={units > item.units} onClick={() => void requestTransfer(item)} icon={<Send className="h-4 w-4" />}>{units > item.units ? 'Insufficient stock' : 'Request Transfer'}</Button></div>)}{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No available inventory found" description="Try another blood group or search location." />}</div></div></Card><Card><CardHeader title="Your Blood Transfer Requests" subtitle="Track requests sent to Blood Banks." icon={<HeartHandshake className="h-5 w-5" />} /><div className="space-y-3 p-5">{transfers.length === 0 ? <EmptyState icon={<Send className="h-6 w-6" />} title="No transfer requests" description="Requests you send from available inventory will appear here." /> : transfers.map((transfer) => <div key={transfer.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><BloodGroupBadge group={transfer.blood_group} /><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{transfer.units} unit(s) requested</p><p className="text-xs text-slate-500">Sent {formatDate(transfer.created_at)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{transfer.status}</span></div>)}</div></Card></div>;
}

export function HospitalBankFinder({ profile }: { profile: Profile }) {
  const [banks, setBanks] = useState<BloodBank[]>([]); const [query, setQuery] = useState(''); const [group, setGroup] = useState<BloodGroup>('O+');
  useEffect(() => { (async () => { const { data } = await supabase.from('blood_banks').select('*').in('verification_status', ['pending', 'verified']).order('bank_name'); setBanks((data as BloodBank[]) || []); })(); }, []);
  const send = async (bank: BloodBank) => { await supabase.from('connection_requests').insert({ kind: 'hospital_bank', requester_id: profile.id, recipient_id: bank.user_id, blood_group: group, units: 1, message: `Our hospital needs ${group} blood. Please review this request.` }); };
  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return banks;
    return banks.filter((bank) => {
      const searchable = [bank.bank_name, bank.location, bank.contact_number, bank.license_number, bank.verification_status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  }, [banks, query]);
  return <Card><CardHeader title="Find Matched Blood Banks" subtitle="Search registered blood banks by name, location, or contact details." icon={<Search className="h-5 w-5" />} /><div className="p-5"><div className="grid gap-3 sm:grid-cols-2"><Select label="Required blood group" value={group} onChange={(event) => setGroup(event.target.value as BloodGroup)}>{BLOOD_GROUPS.map((item) => <option key={item}>{item}</option>)}</Select><Input label="Search blood bank or location" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="mt-5 space-y-3">{visible.map((bank) => { const verified = bank.verification_status === 'verified'; return <div key={bank.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">B</div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><PublicProfileLink userId={bank.user_id} role="blood_bank" label={bank.bank_name} className="text-sm font-semibold text-slate-900" /><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{verified ? 'Verified' : 'Pending review'}</span></div><p className="text-xs text-slate-500">{bank.location}</p></div><Button size="sm" variant={verified ? 'primary' : 'outline'} disabled={!verified} onClick={() => void send(bank)} icon={<Send className="h-4 w-4" />}>{verified ? 'Request Blood' : 'Pending approval'}</Button></div>; })}{visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="No blood banks found" description={query ? 'Try a different name, location, or contact detail.' : 'No blood banks have registered yet.'} />}</div></div></Card>;
}
