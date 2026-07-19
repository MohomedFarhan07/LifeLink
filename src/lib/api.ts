// Change this one fallback URL whenever the public backend tunnel changes.
// VITE_BACKEND_URL can still override it per deployment environment.
export const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? 'https://evidence-say-aggregate-recruitment.trycloudflare.com').replace(/\/+$/, '');

export const AI_API = {
  chat: `${API_BASE_URL}/api/ai/chat`,
  eligibility: `${API_BASE_URL}/api/ai/eligibility`,
  questions: `${API_BASE_URL}/api/ai/questions`,
} as const;
