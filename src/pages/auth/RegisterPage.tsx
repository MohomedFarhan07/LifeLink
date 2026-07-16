import { useState } from 'react';
import { Mail, Lock, User, Phone, Droplet, Building2, Activity, HandHeart, Shield, AlertCircle, Check, MapPin, FileText } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input, Select } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { Role } from '../../types';
import { BLOOD_GROUPS, CITIES } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { mockCoords } from '../../lib/utils';

const roles: { id: Role; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'donor', label: 'Donor', icon: <Droplet className="h-5 w-5" />, desc: 'Donate blood & organs' },
  { id: 'hospital', label: 'Hospital', icon: <Building2 className="h-5 w-5" />, desc: 'Request blood for patients' },
  { id: 'blood_bank', label: 'Blood Bank', icon: <Activity className="h-5 w-5" />, desc: 'Manage blood inventory' },
  { id: 'volunteer', label: 'Volunteer / NGO', icon: <HandHeart className="h-5 w-5" />, desc: 'Run awareness campaigns' },
];

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // common
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [address, setAddress] = useState('');

  // donor
  const [nic, setNic] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [organPref, setOrganPref] = useState(false);

  // hospital
  const [hospitalName, setHospitalName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [hospitalType, setHospitalType] = useState('public');
  const [hospitalContact, setHospitalContact] = useState('');

  // blood bank
  const [bankName, setBankName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bankContact, setBankContact] = useState('');

  // volunteer
  const [orgName, setOrgName] = useState('');
  const [ngoReg, setNgoReg] = useState('');
  const [orgContact, setOrgContact] = useState('');

  const selectRole = (r: Role) => {
    setRole(r);
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!role) return;
    setLoading(true);

    const nameForProfile =
      role === 'hospital' ? hospitalName :
      role === 'blood_bank' ? bankName :
      role === 'volunteer' ? orgName :
      fullName;

    const { error: signUpError } = await signUp(email, password, nameForProfile, role, phone);
    if (signUpError) {
      setLoading(false);
      setError(signUpError.includes('already') ? 'An account with this email already exists. Try logging in.' : signUpError);
      return;
    }

    // Insert role-specific record
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const coords = mockCoords(city);

    if (role === 'donor') {
      await supabase.from('donors').insert({
        user_id: user.id,
        nic_number: nic,
        date_of_birth: dob || null,
        gender,
        blood_group: bloodGroup,
        emergency_contact: emergencyContact,
        medical_history: medicalHistory,
        organ_donation_preference: organPref,
        availability_status: 'available',
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } else if (role === 'hospital') {
      await supabase.from('hospitals').insert({
        user_id: user.id,
        hospital_name: hospitalName,
        registration_number: regNumber,
        hospital_type: hospitalType,
        contact_number: hospitalContact,
        location: city,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } else if (role === 'blood_bank') {
      await supabase.from('blood_banks').insert({
        user_id: user.id,
        bank_name: bankName,
        license_number: licenseNumber,
        contact_number: bankContact,
        location: city,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    } else if (role === 'volunteer') {
      await supabase.from('volunteers').insert({
        user_id: user.id,
        organization_name: orgName,
        ngo_registration_number: ngoReg,
        contact_number: orgContact,
        location: city,
      });
    }

    // update profile city/address
    await supabase.from('profiles').update({ city, address, phone }).eq('id', user.id);

    setLoading(false);
    toast('Account created! Welcome to LifeLink.');
    navigate('/dashboard');
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join LifeLink and start saving lives today.">
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm font-medium text-slate-700">Choose your role to get started:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRole(r.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-brand-300 hover:shadow-card ${
                  role === r.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  role === r.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>{r.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3.5 py-2.5 text-xs text-sky-700">
            <Shield className="h-4 w-4 shrink-0" /> Admin accounts are created internally by the platform team.
          </div>
        </div>
      )}

      {step === 2 && role && (
        <form onSubmit={submit} className="space-y-4">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700">
            ← Change role
          </button>

          {/* Common fields */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Account Details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={role === 'donor' ? 'Full Name' : 'Contact Person Name'} required icon={<User className="h-4 w-4" />} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
              <Input label="Email" type="email" required icon={<Mail className="h-4 w-4" />} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <Input label="Phone" required icon={<Phone className="h-4 w-4" />} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" />
              <Input label="Password" type="password" required icon={<Lock className="h-4 w-4" />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
              <Select label="City" value={city} onChange={(e) => setCity(e.target.value)}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input label="Address" icon={<MapPin className="h-4 w-4" />} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
            </div>
          </div>

          {/* Role-specific fields */}
          {role === 'donor' && (
            <div className="rounded-lg bg-brand-50/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-600"><Droplet className="h-3.5 w-3.5" /> Donor Information</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="NIC / ID Number" required value={nic} onChange={(e) => setNic(e.target.value)} placeholder="199012345678" />
                <Input label="Date of Birth" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
                <Select label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </Select>
                <Select label="Blood Group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
                <Input label="Emergency Contact" required value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="+94 77 765 4321" />
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700">
                    <input type="checkbox" checked={organPref} onChange={(e) => setOrganPref(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    Willing to donate organs
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Input label="Medical History (optional)" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="Any conditions, allergies, medications..." />
                </div>
              </div>
            </div>
          )}

          {role === 'hospital' && (
            <div className="rounded-lg bg-sky-50/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-600"><Building2 className="h-3.5 w-3.5" /> Hospital Information</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Hospital Name" required value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="National Hospital" />
                <Input label="Registration Number" required value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="HOS-2024-001" />
                <Select label="Hospital Type" value={hospitalType} onChange={(e) => setHospitalType(e.target.value)}>
                  <option value="public">Public</option><option value="private">Private</option><option value="teaching">Teaching</option><option value="specialist">Specialist</option><option value="clinic">Clinic</option>
                </Select>
                <Input label="Hospital Contact" required value={hospitalContact} onChange={(e) => setHospitalContact(e.target.value)} placeholder="+94 11 555 1234" />
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-white p-3 text-xs text-slate-500">
                <FileText className="h-4 w-4 shrink-0" /> Verification documents will be reviewed by our admin team after registration.
              </div>
            </div>
          )}

          {role === 'blood_bank' && (
            <div className="rounded-lg bg-emerald-50/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600"><Activity className="h-3.5 w-3.5" /> Blood Bank Information</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Blood Bank Name" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="National Blood Center" />
                <Input label="License Number" required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="BB-2024-001" />
                <Input label="Contact Number" required value={bankContact} onChange={(e) => setBankContact(e.target.value)} placeholder="+94 11 555 5678" />
              </div>
            </div>
          )}

          {role === 'volunteer' && (
            <div className="rounded-lg bg-amber-50/50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600"><HandHeart className="h-3.5 w-3.5" /> Organization Information</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Organization Name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Red Hearts NGO" />
                <Input label="NGO Registration Number" value={ngoReg} onChange={(e) => setNgoReg(e.target.value)} placeholder="NGO-2024-001" />
                <Input label="Organization Contact" required value={orgContact} onChange={(e) => setOrgContact(e.target.value)} placeholder="+94 11 555 9012" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <label className="flex items-start gap-2.5 text-xs text-slate-500">
            <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            I agree to LifeLink's Terms of Service and Privacy Policy, and consent to processing of my health data for donation matching.
          </label>

          <Button type="submit" loading={loading} className="w-full" size="lg" icon={<Check className="h-4 w-4" />}>
            Create Account
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
