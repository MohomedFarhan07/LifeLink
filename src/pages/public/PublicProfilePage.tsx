import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Building2, Heart, MapPin, ShieldCheck, Users } from 'lucide-react';
import { PublicPage } from '../../components/public/PublicPage';
import { Card } from '../../components/ui/Card';
import { BloodGroupBadge, VerificationBadge } from '../../components/shared/Badges';
import { supabase } from '../../lib/supabase';
import { BloodBank, Donor, Hospital, Profile, PublicProfile } from '../../types';

export function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase.from('public_profiles').select('*').eq('id', userId).maybeSingle();
    if (!error) {
      setProfile(data as PublicProfile | null);
      setLoading(false);
      return;
    }

    // Existing installations may not have run the public-profile migration yet.
    // Signed-in users can still use the pre-existing authenticated policies.
    if (error.code === 'PGRST205') {
      const { data: profileRow } = await supabase.from('profiles').select('id, role, full_name, city, avatar_url').eq('id', userId).maybeSingle();
      const person = profileRow as Pick<Profile, 'id' | 'role' | 'full_name' | 'city' | 'avatar_url'> | null;
      if (!person || person.role === 'admin') { setLoading(false); return; }
      if (person.role === 'donor') {
        const { data: donorRow } = await supabase.from('donors').select('blood_group, availability_status').eq('user_id', userId).maybeSingle();
        const donor = donorRow as Pick<Donor, 'blood_group' | 'availability_status'> | null;
        setProfile(donor ? { id: person.id, role: person.role, display_name: person.full_name, city: person.city, avatar_url: person.avatar_url, blood_group: donor.blood_group, availability_status: donor.availability_status, organization_name: null, organization_type: null, location: null, verification_status: null } : null);
      } else {
        const table = person.role === 'hospital' ? 'hospitals' : 'blood_banks';
        const { data: organizationRow } = await supabase.from(table).select(person.role === 'hospital' ? 'hospital_name, hospital_type, location, verification_status' : 'bank_name, location, verification_status').eq('user_id', userId).maybeSingle();
        const organization = organizationRow as Partial<Hospital & BloodBank> | null;
        setProfile(organization ? { id: person.id, role: person.role, display_name: person.role === 'hospital' ? organization.hospital_name || person.full_name : organization.bank_name || person.full_name, city: person.city, avatar_url: person.avatar_url, blood_group: null, availability_status: null, organization_name: person.role === 'hospital' ? organization.hospital_name || null : organization.bank_name || null, organization_type: organization.hospital_type || null, location: organization.location || null, verification_status: organization.verification_status || null } : null);
      }
    }
    setLoading(false);
  })(); }, [userId]);

  if (loading) return <PublicPage><div className="mx-auto max-w-4xl px-4 py-24"><div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /></div></PublicPage>;
  if (!profile) return <PublicPage><section className="mx-auto max-w-3xl px-4 py-24 text-center"><Users className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Profile unavailable</h1><p className="mt-2 text-slate-500">This profile is not publicly available.</p></section></PublicPage>;

  const isDonor = profile.role === 'donor';
  const isHospital = profile.role === 'hospital';
  const title = profile.display_name;
  const icon = isDonor ? <Heart className="h-7 w-7" /> : isHospital ? <Building2 className="h-7 w-7" /> : <Activity className="h-7 w-7" />;
  const roleLabel = isDonor ? 'Blood donor' : isHospital ? 'Hospital' : 'Blood Bank';
  const location = isDonor ? profile.city : profile.location;

  return <PublicPage><section className="public-hero py-14"><div className="mx-auto max-w-4xl px-4 sm:px-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">{icon}</div><div><p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{roleLabel}</p><h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>{location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300"><MapPin className="h-4 w-4" />{location}</p>}</div></div></div></section><section className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><div className="grid gap-5 sm:grid-cols-2">{isDonor && <><Card className="p-5"><p className="text-sm text-slate-500">Blood group</p><div className="mt-3">{profile.blood_group && <BloodGroupBadge group={profile.blood_group} size="lg" />}</div></Card><Card className="p-5"><p className="text-sm text-slate-500">Donation availability</p><p className="mt-3 font-semibold capitalize text-slate-900 dark:text-slate-100">{profile.availability_status?.replace(/_/g, ' ') || 'Not provided'}</p></Card></>}{!isDonor && <><Card className="p-5"><p className="text-sm text-slate-500">Verification</p><div className="mt-3">{profile.verification_status && <VerificationBadge status={profile.verification_status} />}</div></Card>{isHospital && <Card className="p-5"><p className="text-sm text-slate-500">Hospital type</p><p className="mt-3 font-semibold capitalize text-slate-900 dark:text-slate-100">{profile.organization_type || 'Not provided'}</p></Card>}</>}</div><div className="mt-8 flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />Only public information relevant to donation coordination is shown here.</div></section></PublicPage>;
}
