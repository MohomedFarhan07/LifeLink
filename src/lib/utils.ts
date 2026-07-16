import { BloodGroup, Urgency, VerificationStatus } from '../types';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const CITIES = [
  'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Negombo', 'Trincomalee',
  'Batticaloa', 'Matara', 'Kurunegala', 'Anuradhapura', 'Ratnapura',
  'Badulla', 'Nuwara Eliya', 'Puttalam', 'Polonnaruwa',
];

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// Blood compatibility: which donor groups can give to which recipient group
const COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export function compatibleDonorGroups(recipient: BloodGroup): BloodGroup[] {
  return (Object.keys(COMPATIBILITY) as BloodGroup[]).filter((donor) =>
    COMPATIBILITY[donor as BloodGroup].includes(recipient)
  );
}

export function urgencyLabel(u: Urgency): string {
  return { critical: 'Critical', high: 'High', normal: 'Normal' }[u];
}

export function verificationLabel(v: VerificationStatus): string {
  return { pending: 'Pending Review', verified: 'Verified', rejected: 'Rejected' }[v];
}

export function bloodGroupColor(_bg: BloodGroup): string {
  return 'bg-brand-50 text-brand-700 border border-brand-200';
}

// Haversine distance in km
export function distanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mock geocode: assign pseudo-random coords based on city name (no external API)
export function mockCoords(city: string): { latitude: number; longitude: number } {
  if (!city) return { latitude: 6.9271, longitude: 79.8612 };
  let hash = 0;
  for (let i = 0; i < city.length; i++) hash = (hash * 31 + city.charCodeAt(i)) & 0xffff;
  const lat = 6.0 + (hash % 700) / 100;
  const lon = 79.5 + ((hash >> 8) % 200) / 100;
  return { latitude: lat, longitude: lon };
}
