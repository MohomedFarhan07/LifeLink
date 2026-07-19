import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, PieChart, TrendingUp, Plus, Heart, Droplet, Activity,
  Building2, Stethoscope, Brain, Trash2,
} from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { BarChart, DonutChart, LineChart } from '../../components/ui/Charts';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { BloodRequest, BloodUsage, OrganRequest, BloodGroup, Urgency } from '../../types';
import { formatDate, BLOOD_GROUPS } from '../../lib/utils';

const ORGANS = ['kidney', 'liver', 'heart', 'lung', 'pancreas', 'cornea', 'intestine', 'heart_lung', 'kidney_pancreas'] as const;
const DEPARTMENTS = ['Emergency (ER)', 'ICU', 'Surgery', 'Oncology', 'Maternity', 'Cardiology', 'Orthopedics', 'Pediatrics', 'General Ward'] as const;
const USAGE_TYPES = ['transfusion', 'surgery', 'emergency', 'research'] as const;
const OUTCOMES = ['stable', 'recovered', 'critical', 'deceased'] as const;

const organColors: Record<string, string> = {
  kidney: '#dc2626', liver: '#0ea5e9', heart: '#ec4899', lung: '#10b981',
  pancreas: '#f59e0b', cornea: '#8b5cf6', intestine: '#14b8a6',
  heart_lung: '#f97316', kidney_pancreas: '#6366f1',
};

const bloodGroupColors: Record<string, string> = {
  'O+': '#dc2626', 'O-': '#ef4444', 'A+': '#0ea5e9', 'A-': '#38bdf8',
  'B+': '#10b981', 'B-': '#34d399', 'AB+': '#f59e0b', 'AB-': '#fbbf24',
};

export function HospitalAnalytics({ hospitalId }: { hospitalId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [organRequests, setOrganRequests] = useState<OrganRequest[]>([]);
  const [bloodUsage, setBloodUsage] = useState<BloodUsage[]>([]);
  const [organModalOpen, setOrganModalOpen] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);

  const [organForm, setOrganForm] = useState({
    organ_needed: 'kidney' as typeof ORGANS[number],
    blood_group: 'O+' as BloodGroup,
    patient_urgency: 'normal' as Urgency,
    recipient_age: 0,
    recipient_blood_group: 'O+' as BloodGroup,
    notes: '',
  });

  const [usageForm, setUsageForm] = useState({
    blood_group: 'O+' as BloodGroup,
    units_used: 1,
    department: 'Emergency (ER)' as typeof DEPARTMENTS[number],
    usage_type: 'transfusion' as typeof USAGE_TYPES[number],
    usage_date: new Date().toISOString().split('T')[0],
    patient_outcome: 'stable' as typeof OUTCOMES[number],
    notes: '',
  });

  const loadData = useCallback(async () => {
    const [reqsRes, organsRes, usageRes] = await Promise.all([
      supabase.from('blood_requests').select('*').eq('hospital_id', hospitalId).order('created_at', { ascending: true }),
      supabase.from('organ_requests').select('*').eq('hospital_id', hospitalId).order('created_at', { ascending: false }),
      supabase.from('blood_usage').select('*').eq('hospital_id', hospitalId).order('usage_date', { ascending: true }),
    ]);
    setRequests((reqsRes.data as BloodRequest[]) || []);
    setOrganRequests((organsRes.data as OrganRequest[]) || []);
    setBloodUsage((usageRes.data as BloodUsage[]) || []);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addOrganRequest = async () => {
    const { data, error } = await supabase.from('organ_requests').insert({
      hospital_id: hospitalId,
      organ_needed: organForm.organ_needed,
      blood_group: organForm.blood_group,
      patient_urgency: organForm.patient_urgency,
      recipient_age: organForm.recipient_age || null,
      recipient_blood_group: organForm.recipient_blood_group,
      notes: organForm.notes,
      status: 'open',
    }).select().single();
    if (error) { toast('Failed to add organ request: ' + error.message, 'error'); return; }
    setOrganRequests((prev) => [data as OrganRequest, ...prev]);
    setOrganModalOpen(false);
    toast('Organ request added successfully.');
  };

  const addBloodUsage = async () => {
    const { data, error } = await supabase.from('blood_usage').insert({
      hospital_id: hospitalId,
      blood_group: usageForm.blood_group,
      units_used: usageForm.units_used,
      department: usageForm.department,
      usage_type: usageForm.usage_type,
      usage_date: usageForm.usage_date,
      patient_outcome: usageForm.patient_outcome,
      notes: usageForm.notes,
    }).select().single();
    if (error) { toast('Failed to log blood usage: ' + error.message, 'error'); return; }
    setBloodUsage((prev) => [data as BloodUsage, ...prev]);
    setUsageModalOpen(false);
    toast('Blood usage logged successfully.');
  };

  const deleteOrganRequest = async (id: string) => {
    const { error } = await supabase.from('organ_requests').delete().eq('id', id);
    if (error) { toast('Failed to delete: ' + error.message, 'error'); return; }
    setOrganRequests((prev) => prev.filter((o) => o.id !== id));
    toast('Organ request removed.');
  };

  const deleteBloodUsage = async (id: string) => {
    const { error } = await supabase.from('blood_usage').delete().eq('id', id);
    if (error) { toast('Failed to delete: ' + error.message, 'error'); return; }
    setBloodUsage((prev) => prev.filter((u) => u.id !== id));
    toast('Usage record removed.');
  };

  // ---- Aggregations ----
  const totalBloodRequested = requests.reduce((s, r) => s + r.quantity_units, 0);
  const totalBloodUsed = bloodUsage.reduce((s, u) => s + u.units_used, 0);
  const openOrganRequests = organRequests.filter((o) => o.status === 'open').length;
  const transplantedOrgans = organRequests.filter((o) => o.status === 'transplanted').length;

  // Blood requests by group (bar chart)
  const requestsByGroup = BLOOD_GROUPS.map((g) => ({
    label: g,
    value: requests.filter((r) => r.blood_group === g).length,
    color: bloodGroupColors[g],
  }));

  // Blood usage by department (bar chart)
  const usageByDept = DEPARTMENTS.map((d) => ({
    label: d.split(' ')[0],
    value: bloodUsage.filter((u) => u.department === d).reduce((s, u) => s + u.units_used, 0),
  }));

  // Organ requests distribution (donut chart)
  const organDistribution = ORGANS.map((o) => ({
    label: o.replace('_', ' '),
    value: organRequests.filter((r) => r.organ_needed === o).length,
    color: organColors[o],
  })).filter((d) => d.value > 0);

  // Request status breakdown (donut chart)
  const statusBreakdown = [
    { label: 'Open', value: requests.filter((r) => r.status === 'open').length, color: '#dc2626' },
    { label: 'Matched', value: requests.filter((r) => r.status === 'matched').length, color: '#f59e0b' },
    { label: 'Fulfilled', value: requests.filter((r) => r.status === 'fulfilled').length, color: '#10b981' },
    { label: 'Expired', value: requests.filter((r) => r.status === 'expired').length, color: '#94a3b8' },
    { label: 'Cancelled', value: requests.filter((r) => r.status === 'cancelled').length, color: '#64748b' },
  ].filter((d) => d.value > 0);

  // Patient outcomes (donut chart)
  const outcomeBreakdown = OUTCOMES.map((o) => ({
    label: o.charAt(0).toUpperCase() + o.slice(1),
    value: bloodUsage.filter((u) => u.patient_outcome === o).length,
    color: o === 'recovered' ? '#10b981' : o === 'stable' ? '#0ea5e9' : o === 'critical' ? '#f59e0b' : '#dc2626',
  })).filter((d) => d.value > 0);

  // Monthly trend — last 6 months blood requests (line chart)
  const now = new Date();
  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short' });
    const value = requests.filter((r) => {
      const rd = new Date(r.created_at);
      return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
    }).length;
    months.push({ label, value });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Hospital Analytics</h3>
          <p className="text-sm text-slate-500">Track blood requests, usage, organ needs, and patient outcomes</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOrganModalOpen(true)} icon={<Heart className="h-4 w-4" />}>Organ Request</Button>
          <Button size="sm" onClick={() => setUsageModalOpen(true)} icon={<Plus className="h-4 w-4" />}>Log Usage</Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Blood Requested" value={`${totalBloodRequested} units`} icon={<Droplet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Total Blood Used" value={`${totalBloodUsed} units`} icon={<Activity className="h-5 w-5" />} accent="sky" />
        <StatCard label="Open Organ Requests" value={openOrganRequests} icon={<Heart className="h-5 w-5" />} accent="amber" />
        <StatCard label="Organs Transplanted" value={transplantedOrgans} icon={<Stethoscope className="h-5 w-5" />} accent="emerald" />
      </div>

      {/* Charts row 1: Monthly trend + Blood requests by group */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Blood Requests Trend" subtitle="Last 6 months" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="p-5">
            {months.every((m) => m.value === 0) ? (
              <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No data yet" description="Blood requests will appear here as they are created." />
            ) : (
              <LineChart data={months} height={220} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Requests by Blood Group" subtitle="Total requests per group" icon={<BarChart3 className="h-5 w-5" />} />
          <div className="p-5">
            {requestsByGroup.every((d) => d.value === 0) ? (
              <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No data yet" description="Create blood requests to see distribution." />
            ) : (
              <BarChart data={requestsByGroup} height={220} unit="" />
            )}
          </div>
        </Card>
      </div>

      {/* Charts row 2: Organ distribution + Request status */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Organ Requests Distribution" subtitle="By organ type" icon={<PieChart className="h-5 w-5" />} />
          <div className="p-5">
            {organDistribution.length === 0 ? (
              <EmptyState icon={<Heart className="h-6 w-6" />} title="No organ requests" description="Add organ requests to see distribution." />
            ) : (
              <DonutChart data={organDistribution} size={180} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Request Status Breakdown" subtitle="Blood request lifecycle" icon={<Activity className="h-5 w-5" />} />
          <div className="p-5">
            {statusBreakdown.length === 0 ? (
              <EmptyState icon={<Activity className="h-6 w-6" />} title="No data yet" description="Request statuses will appear here." />
            ) : (
              <DonutChart data={statusBreakdown} size={180} />
            )}
          </div>
        </Card>
      </div>

      {/* Charts row 3: Usage by department + Patient outcomes */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Blood Usage by Department" subtitle="Units consumed per department" icon={<Building2 className="h-5 w-5" />} />
          <div className="p-5">
            {usageByDept.every((d) => d.value === 0) ? (
              <EmptyState icon={<Building2 className="h-6 w-6" />} title="No usage logged" description="Log blood usage to see department breakdown." />
            ) : (
              <BarChart data={usageByDept.filter((d) => d.value > 0)} height={220} unit="u" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Patient Outcomes" subtitle="Post-transfusion results" icon={<Brain className="h-5 w-5" />} />
          <div className="p-5">
            {outcomeBreakdown.length === 0 ? (
              <EmptyState icon={<Brain className="h-6 w-6" />} title="No outcomes recorded" description="Patient outcomes will appear here as usage is logged." />
            ) : (
              <DonutChart data={outcomeBreakdown} size={180} />
            )}
          </div>
        </Card>
      </div>

      {/* Tables: Organ requests + Recent blood usage */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Organ Requests"
            subtitle={`${organRequests.length} total`}
            icon={<Heart className="h-5 w-5" />}
            action={<Button size="sm" variant="outline" onClick={() => setOrganModalOpen(true)} icon={<Plus className="h-4 w-4" />}>Add</Button>}
          />
          <div className="p-5">
            {organRequests.length === 0 ? (
              <EmptyState icon={<Heart className="h-6 w-6" />} title="No organ requests" description="Create organ transplant requests here." action={<Button size="sm" onClick={() => setOrganModalOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Request</Button>} />
            ) : (
              <div className="space-y-3">
                {organRequests.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: (organColors[o.organ_needed] || '#dc2626') + '20' }}>
                      <Heart className="h-4 w-4" style={{ color: organColors[o.organ_needed] || '#dc2626' }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize text-slate-900">{o.organ_needed.replace('_', ' ')}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge variant={o.patient_urgency === 'critical' ? 'error' : o.patient_urgency === 'high' ? 'warning' : 'neutral'}>
                          {o.patient_urgency}
                        </Badge>
                        {o.recipient_blood_group && <span>BG: {o.recipient_blood_group}</span>}
                        {o.recipient_age && <span>Age: {o.recipient_age}</span>}
                        <span>{formatDate(o.created_at)}</span>
                      </div>
                    </div>
                    <Badge variant={o.status === 'open' ? 'error' : o.status === 'transplanted' ? 'success' : 'neutral'}>
                      {o.status}
                    </Badge>
                    <button onClick={() => deleteOrganRequest(o.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent Blood Usage"
            subtitle={`${bloodUsage.length} records`}
            icon={<Droplet className="h-5 w-5" />}
            action={<Button size="sm" variant="outline" onClick={() => setUsageModalOpen(true)} icon={<Plus className="h-4 w-4" />}>Log</Button>}
          />
          <div className="p-5">
            {bloodUsage.length === 0 ? (
              <EmptyState icon={<Droplet className="h-6 w-6" />} title="No usage logged" description="Log blood usage to track consumption." action={<Button size="sm" onClick={() => setUsageModalOpen(true)} icon={<Plus className="h-4 w-4" />}>Log Usage</Button>} />
            ) : (
              <div className="space-y-3">
                {bloodUsage.slice(-8).reverse().map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                      <Droplet className="h-4 w-4 text-brand-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{u.units_used} units · {u.blood_group}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{u.department}</span>
                        <Badge variant="neutral">{u.usage_type}</Badge>
                        <span>{formatDate(u.usage_date)}</span>
                      </div>
                    </div>
                    <Badge variant={u.patient_outcome === 'recovered' ? 'success' : u.patient_outcome === 'critical' ? 'warning' : u.patient_outcome === 'deceased' ? 'error' : 'neutral'}>
                      {u.patient_outcome}
                    </Badge>
                    <button onClick={() => deleteBloodUsage(u.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Organ request modal */}
      <Modal
        open={organModalOpen}
        onClose={() => setOrganModalOpen(false)}
        title="Create Organ Request"
        subtitle="Record an organ transplant need for your hospital"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOrganModalOpen(false)}>Cancel</Button>
            <Button onClick={addOrganRequest} icon={<Heart className="h-4 w-4" />}>Create Request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Organ Needed" value={organForm.organ_needed} onChange={(e) => setOrganForm({ ...organForm, organ_needed: e.target.value as typeof ORGANS[number] })}>
              {ORGANS.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
            </Select>
            <Select label="Patient Urgency" value={organForm.patient_urgency} onChange={(e) => setOrganForm({ ...organForm, patient_urgency: e.target.value as Urgency })}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Select label="Recipient Blood Group" value={organForm.recipient_blood_group} onChange={(e) => setOrganForm({ ...organForm, recipient_blood_group: e.target.value as BloodGroup })}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Input label="Recipient Age" type="number" min={0} max={120} value={organForm.recipient_age || ''} onChange={(e) => setOrganForm({ ...organForm, recipient_age: Number(e.target.value) })} />
            <Select label="Required Blood Group (donor)" value={organForm.blood_group} onChange={(e) => setOrganForm({ ...organForm, blood_group: e.target.value as BloodGroup })}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" rows={3} value={organForm.notes} onChange={(e) => setOrganForm({ ...organForm, notes: e.target.value })} placeholder="Patient condition, urgency details..." />
        </div>
      </Modal>

      {/* Blood usage modal */}
      <Modal
        open={usageModalOpen}
        onClose={() => setUsageModalOpen(false)}
        title="Log Blood Usage"
        subtitle="Record blood units consumed for analytics"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setUsageModalOpen(false)}>Cancel</Button>
            <Button onClick={addBloodUsage} icon={<Droplet className="h-4 w-4" />}>Log Usage</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Blood Group" value={usageForm.blood_group} onChange={(e) => setUsageForm({ ...usageForm, blood_group: e.target.value as BloodGroup })}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Input label="Units Used" type="number" min={1} max={50} value={usageForm.units_used} onChange={(e) => setUsageForm({ ...usageForm, units_used: Number(e.target.value) })} />
            <Select label="Department" value={usageForm.department} onChange={(e) => setUsageForm({ ...usageForm, department: e.target.value as typeof DEPARTMENTS[number] })}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select label="Usage Type" value={usageForm.usage_type} onChange={(e) => setUsageForm({ ...usageForm, usage_type: e.target.value as typeof USAGE_TYPES[number] })}>
              {USAGE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
            <Input label="Usage Date" type="date" value={usageForm.usage_date} onChange={(e) => setUsageForm({ ...usageForm, usage_date: e.target.value })} />
            <Select label="Patient Outcome" value={usageForm.patient_outcome} onChange={(e) => setUsageForm({ ...usageForm, patient_outcome: e.target.value as typeof OUTCOMES[number] })}>
              {OUTCOMES.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </Select>
          </div>
          <Textarea label="Notes" rows={3} value={usageForm.notes} onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })} placeholder="Case details, patient notes..." />
        </div>
      </Modal>
    </div>
  );
}
