import { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, Droplet, AlertTriangle, Clock, Check, X, Send, TrendingUp, Building2, Package } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { BloodGroupBadge, StatusBadge, VerificationBadge } from '../../components/shared/Badges';
import { BarChart } from '../../components/ui/Charts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { BloodInventory, BloodBank, BloodTransfer, BloodGroup } from '../../types';
import { formatDate, BLOOD_GROUPS, daysUntil } from '../../lib/utils';
import { sendNotification } from '../../lib/notifications';

type Tab = 'overview' | 'inventory' | 'transfers' | 'profile';

export function BloodBankDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState<BloodBank | null>(null);
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [transfers, setTransfers] = useState<BloodTransfer[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    blood_group: 'O+' as BloodGroup,
    units: 1,
    collection_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 42 * 86400000).toISOString().split('T')[0],
  });

  const loadData = useCallback(async () => {
    if (!profile) return;
    const { data: b } = await supabase.from('blood_banks').select('*').eq('user_id', profile.id).maybeSingle();
    setBank(b as BloodBank | null);

    const { data: inv } = await supabase.from('blood_inventory').select('*').eq('bank_id', profile.id).order('expiry_date', { ascending: true });
    setInventory((inv as BloodInventory[]) || []);

    const { data: tr } = await supabase.from('blood_transfers').select('*').eq('bank_id', profile.id).order('created_at', { ascending: false });
    setTransfers((tr as BloodTransfer[]) || []);

    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addInventory = async () => {
    if (!profile || !bank) return;
    const { error } = await supabase.from('blood_inventory').insert({
      bank_id: profile.id,
      bank_name: bank.bank_name,
      blood_group: addForm.blood_group,
      units: addForm.units,
      collection_date: addForm.collection_date,
      expiry_date: addForm.expiry_date,
      status: 'available',
    });
    if (error) {
      toast('Failed to add inventory: ' + error.message, 'error');
      return;
    }
    setAddOpen(false);
    toast('Blood unit added to inventory.');
    loadData();
  };

  const updateUnits = async (item: BloodInventory, delta: number) => {
    const newUnits = Math.max(0, item.units + delta);
    const status = newUnits === 0 ? 'depleted' : daysUntil(item.expiry_date) < 0 ? 'expired' : 'available';
    await supabase.from('blood_inventory').update({ units: newUnits, status }).eq('id', item.id);
    setInventory((prev) => prev.map((i) => (i.id === item.id ? { ...i, units: newUnits, status } : i)));
    toast('Inventory updated.');
  };

  const deleteInventory = async (item: BloodInventory) => {
    await supabase.from('blood_inventory').delete().eq('id', item.id);
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
    toast('Inventory item removed.');
  };

  const approveTransfer = async (t: BloodTransfer) => {
    await supabase.from('blood_transfers').update({ status: 'approved' }).eq('id', t.id);
    setTransfers((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: 'approved' } : x)));
    await sendNotification(t.hospital_id, 'transfer', 'Blood transfer approved', `Your ${t.blood_group} blood transfer request has been approved by the blood bank.`, '/dashboard');
    toast('Transfer approved. Hospital notified.');
  };

  const rejectTransfer = async (t: BloodTransfer) => {
    await supabase.from('blood_transfers').update({ status: 'rejected' }).eq('id', t.id);
    setTransfers((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: 'rejected' } : x)));
    await sendNotification(t.hospital_id, 'transfer', 'Blood transfer rejected', `Your ${t.blood_group} blood transfer request has been rejected.`, '/dashboard');
    toast('Transfer rejected. Hospital notified.');
  };

  if (loading) return <DashboardLayout><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></DashboardLayout>;

  // Compute stats
  const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
  const expiringSoon = inventory.filter((i) => { const d = daysUntil(i.expiry_date); return d >= 0 && d <= 7; });
  const expired = inventory.filter((i) => daysUntil(i.expiry_date) < 0);
  const pendingTransfers = transfers.filter((t) => t.status === 'requested');

  const chartData = BLOOD_GROUPS.map((g) => ({
    label: g,
    value: inventory.filter((i) => i.blood_group === g).reduce((s, i) => s + i.units, 0),
  }));

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
    { id: 'transfers', label: 'Hospital Requests', icon: <Send className="h-4 w-4" />, badge: pendingTransfers.length },
    { id: 'profile', label: 'Bank Profile', icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{bank?.bank_name || profile?.full_name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            {bank && <VerificationBadge status={bank.verification_status} />}
            <span>{bank?.location}</span>
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Blood Unit</Button>
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

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Units" value={totalUnits} icon={<Droplet className="h-5 w-5" />} accent="brand" />
            <StatCard label="Expiring Soon" value={expiringSoon.length} icon={<Clock className="h-5 w-5" />} accent="amber" />
            <StatCard label="Expired" value={expired.length} icon={<AlertTriangle className="h-5 w-5" />} accent="brand" />
            <StatCard label="Pending Requests" value={pendingTransfers.length} icon={<Send className="h-5 w-5" />} accent="sky" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Blood Group Distribution" subtitle="Units in stock by blood group" icon={<Activity className="h-5 w-5" />} />
              <div className="p-5">
                {totalUnits === 0 ? (
                  <EmptyState icon={<Droplet className="h-6 w-6" />} title="No inventory" description="Add blood units to see distribution." />
                ) : (
                  <BarChart data={chartData} unit="u" />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Expiry Alerts" subtitle="Units expiring within 7 days" icon={<Clock className="h-5 w-5" />} />
              <div className="p-5">
                {expiringSoon.length === 0 && expired.length === 0 ? (
                  <EmptyState icon={<Check className="h-6 w-6" />} title="All clear" description="No units expiring soon." />
                ) : (
                  <div className="space-y-2">
                    {[...expired, ...expiringSoon].map((i) => {
                      const d = daysUntil(i.expiry_date);
                      return (
                        <div key={i.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                          <BloodGroupBadge group={i.blood_group} size="sm" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{i.units} units</p>
                            <p className="text-xs text-slate-500">Expires {formatDate(i.expiry_date)}</p>
                          </div>
                          <Badge variant={d < 0 ? 'error' : 'warning'} dot>
                            {d < 0 ? 'Expired' : `${d}d left`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Inventory */}
      {tab === 'inventory' && (
        <Card>
          <CardHeader title="Blood Inventory" subtitle="Manage available blood units" icon={<Package className="h-5 w-5" />} action={<Button size="sm" onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Unit</Button>} />
          <div className="p-5">
            {inventory.length === 0 ? (
              <EmptyState icon={<Package className="h-6 w-6" />} title="No inventory yet" description="Add blood units to your inventory to start managing stock." action={<Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Blood Unit</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="pb-3 pr-4">Blood Group</th>
                      <th className="pb-3 pr-4">Units</th>
                      <th className="pb-3 pr-4">Collected</th>
                      <th className="pb-3 pr-4">Expires</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((i) => {
                      const d = daysUntil(i.expiry_date);
                      return (
                        <tr key={i.id} className="border-b border-slate-50">
                          <td className="py-3 pr-4"><BloodGroupBadge group={i.blood_group} size="sm" /></td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateUnits(i, -1)} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
                              <span className="font-semibold text-slate-900 w-8 text-center">{i.units}</span>
                              <button onClick={() => updateUnits(i, 1)} className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-600">{formatDate(i.collection_date)}</td>
                          <td className="py-3 pr-4">
                            <span className={d < 0 ? 'text-brand-600 font-medium' : d <= 7 ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                              {formatDate(i.expiry_date)} {d >= 0 && `(${d}d)`}
                            </span>
                          </td>
                          <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                          <td className="py-3">
                            <button onClick={() => deleteInventory(i)} className="text-xs text-slate-400 hover:text-brand-600">Remove</button>
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

      {/* Transfers */}
      {tab === 'transfers' && (
        <Card>
          <CardHeader title="Hospital Transfer Requests" subtitle="Approve or reject blood transfer requests from hospitals" icon={<Send className="h-5 w-5" />} />
          <div className="p-5">
            {transfers.length === 0 ? (
              <EmptyState icon={<Send className="h-6 w-6" />} title="No transfer requests" description="Blood transfer requests from hospitals will appear here for approval." />
            ) : (
              <div className="space-y-3">
                {transfers.map((t) => (
                  <div key={t.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <BloodGroupBadge group={t.blood_group} size="lg" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{t.units} units requested</p>
                        <p className="mt-0.5 text-xs text-slate-500">Requested {formatDate(t.created_at)}</p>
                        {t.notes && <p className="mt-1 text-sm text-slate-600">{t.notes}</p>}
                      </div>
                      <StatusBadge status={t.status} />
                      {t.status === 'requested' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" onClick={() => approveTransfer(t)} icon={<Check className="h-4 w-4" />}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => rejectTransfer(t)} icon={<X className="h-4 w-4" />}>Reject</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Profile */}
      {tab === 'profile' && bank && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Blood Bank Information" icon={<Building2 className="h-5 w-5" />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <InfoField label="Bank Name" value={bank.bank_name} />
              <InfoField label="License Number" value={bank.license_number} />
              <InfoField label="Contact" value={bank.contact_number} />
              <InfoField label="Location" value={bank.location} />
              <InfoField label="Verification" value={bank.verification_status} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Account" icon={<Building2 className="h-5 w-5" />} />
            <div className="space-y-4 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Activity className="h-9 w-9" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{profile?.full_name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Blood Unit to Inventory"
        subtitle="Record newly collected or received blood units"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addInventory} icon={<Check className="h-4 w-4" />}>Add Unit</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Blood Group" value={addForm.blood_group} onChange={(e) => setAddForm({ ...addForm, blood_group: e.target.value as BloodGroup })}>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Input label="Units" type="number" min={1} value={addForm.units} onChange={(e) => setAddForm({ ...addForm, units: Number(e.target.value) })} />
          <Input label="Collection Date" type="date" value={addForm.collection_date} onChange={(e) => setAddForm({ ...addForm, collection_date: e.target.value })} />
          <Input label="Expiry Date" type="date" value={addForm.expiry_date} onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })} hint="Whole blood expires after 42 days" />
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
