export type Role = 'donor' | 'hospital' | 'blood_bank' | 'admin';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type Urgency = 'critical' | 'high' | 'normal';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone: string;
  avatar_url: string;
  city: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  role: Exclude<Role, 'admin'>;
  display_name: string;
  city: string;
  avatar_url: string;
  blood_group: BloodGroup | null;
  availability_status: Donor['availability_status'] | null;
  organization_name: string | null;
  organization_type: Hospital['hospital_type'] | null;
  location: string | null;
  verification_status: VerificationStatus | null;
}

export interface Donor {
  id: string;
  user_id: string;
  nic_number: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other';
  blood_group: BloodGroup;
  emergency_contact: string;
  medical_history: string;
  last_donation_date: string | null;
  organ_donation_preference: boolean;
  availability_status: 'available' | 'unavailable' | 'temporarily_unavailable';
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  user_id: string;
  hospital_name: string;
  registration_number: string;
  hospital_type: 'public' | 'private' | 'teaching' | 'specialist' | 'clinic';
  contact_number: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: VerificationStatus;
  verification_documents: string[];
  created_at: string;
  updated_at: string;
}

export interface BloodBank {
  id: string;
  user_id: string;
  bank_name: string;
  license_number: string;
  contact_number: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  verification_status: VerificationStatus;
  verification_documents: string[];
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  hospital_id: string;
  hospital_name: string;
  blood_group: BloodGroup;
  quantity_units: number;
  patient_urgency: Urgency;
  location: string;
  required_date: string;
  notes: string;
  status: 'open' | 'matched' | 'fulfilled' | 'expired' | 'cancelled';
  ai_priority_score: number;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  request_id: string | null;
  donor_id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  donation_date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BloodInventory {
  id: string;
  bank_id: string;
  bank_name: string;
  blood_group: BloodGroup;
  units: number;
  collection_date: string;
  expiry_date: string;
  status: 'available' | 'reserved' | 'expired' | 'depleted';
  created_at: string;
  updated_at: string;
}

export interface BloodTransfer {
  id: string;
  inventory_id: string;
  bank_id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  units: number;
  status: 'requested' | 'approved' | 'rejected' | 'dispatched' | 'completed';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Awareness {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  image_url: string;
  location: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface SuccessStory {
  id: string;
  title: string;
  description: string;
  image_url: string;
  location: string;
  recipient_name: string;
  author_id: string | null;
  author_name: string;
  story_date: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  image_url: string;
  location: string;
  event_date: string;
  organizer_id: string | null;
  organizer_name: string;
  participants_count: number;
  goal_units: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface OrganRequest {
  id: string;
  hospital_id: string;
  organ_needed: 'kidney' | 'liver' | 'heart' | 'lung' | 'pancreas' | 'cornea' | 'intestine' | 'heart_lung' | 'kidney_pancreas';
  blood_group: BloodGroup | null;
  patient_urgency: Urgency;
  recipient_age: number | null;
  recipient_blood_group: BloodGroup | null;
  status: 'open' | 'matched' | 'transplanted' | 'expired' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BloodUsage {
  id: string;
  hospital_id: string;
  blood_group: BloodGroup;
  units_used: number;
  department: string;
  usage_type: 'transfusion' | 'surgery' | 'emergency' | 'research';
  usage_date: string;
  patient_outcome: 'stable' | 'recovered' | 'critical' | 'deceased';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  donation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type ConnectionKind = 'bank_donor' | 'hospital_bank';

export interface ConnectionRequest {
  id: string;
  kind: ConnectionKind;
  requester_id: string;
  recipient_id: string;
  blood_group: BloodGroup;
  units: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  request_id: string;
  kind: ConnectionKind;
  participant_one: string;
  participant_two: string;
  created_at: string;
}

export interface ConnectionMessage {
  id: string;
  connection_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface CampaignParticipant {
  id: string;
  campaign_id: string;
  donor_id: string;
  status: 'registered' | 'cancelled' | 'attended';
  created_at: string;
}

export interface DonorWithProfile extends Donor {
  profiles?: Pick<Profile, 'full_name' | 'email' | 'phone' | 'city' | 'avatar_url'>;
}
