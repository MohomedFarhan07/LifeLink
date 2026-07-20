// The public tunnel is tried first. When it is unavailable, AI requests retry
// against the local-network backend so the app remains usable on the same LAN.
export const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? 'https://organised-billy-hitachi-kept.trycloudflare.com').replace(/\/+$/, '');
export const AI_FALLBACK_BASE_URL = 'http://192.168.8.184:5000';

export const AI_API = {
  chat: `${API_BASE_URL}/api/ai/chat`,
  eligibility: `${API_BASE_URL}/api/ai/eligibility`,
  questions: `${API_BASE_URL}/api/ai/questions`,
} as const;

const AI_FALLBACK_API = {
  chat: `${AI_FALLBACK_BASE_URL}/api/ai/chat`,
  eligibility: `${AI_FALLBACK_BASE_URL}/api/ai/eligibility`,
  questions: `${AI_FALLBACK_BASE_URL}/api/ai/questions`,
} as const;

export async function fetchAi(endpoint: keyof typeof AI_API, init: RequestInit) {
  try {
    const response = await fetch(AI_API[endpoint], init);
    if (response.status < 500) return response;
  } catch {
    // Network/tunnel failure: retry the local backend below.
  }
  return fetch(AI_FALLBACK_API[endpoint], init);
}
