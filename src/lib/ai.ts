import { Urgency, Donor, BloodRequest } from '../types';
import { compatibleDonorGroups, distanceKm, daysUntil } from './utils';

/**
 * Emergency Priority System — classifies a blood request into critical/high/normal
 * based on patient urgency, required date proximity, and quantity.
 * Returns a 0-100 priority score alongside the urgency label.
 */
export function classifyPriority(input: {
  patientUrgency: Urgency;
  requiredDate: string;
  quantity: number;
}): { urgency: Urgency; score: number } {
  let score = 40;
  if (input.patientUrgency === 'critical') score += 40;
  else if (input.patientUrgency === 'high') score += 25;

  const days = daysUntil(input.requiredDate);
  if (days <= 0) score += 20;
  else if (days <= 1) score += 15;
  else if (days <= 3) score += 8;
  else if (days > 14) score -= 10;

  if (input.quantity >= 4) score += 10;
  else if (input.quantity >= 2) score += 5;

  score = Math.max(0, Math.min(100, score));

  let urgency: Urgency = 'normal';
  if (score >= 75) urgency = 'critical';
  else if (score >= 55) urgency = 'high';

  return { urgency, score };
}

/**
 * Smart Donor Matching — ranks donors for a blood request using:
 * - Blood group compatibility (exact match preferred over compatible)
 * - Availability status
 * - Geographic distance (if coords available)
 * - Time since last donation (longer rest = higher score)
 */
export interface DonorMatch {
  donor: Donor & { full_name?: string; email?: string; phone?: string; city?: string };
  score: number;
  reasons: string[];
  distanceKm: number | null;
  exactGroup: boolean;
}

export function rankDonorsForRequest(
  request: Pick<BloodRequest, 'blood_group' | 'location' | 'required_date'>,
  donors: (Donor & { full_name?: string; email?: string; phone?: string; city?: string })[],
  requesterCoords?: { latitude: number; longitude: number }
): DonorMatch[] {
  const compatibleGroups = compatibleDonorGroups(request.blood_group);

  const matches: DonorMatch[] = [];

  for (const donor of donors) {
    if (donor.availability_status !== 'available') continue;
    if (!compatibleGroups.includes(donor.blood_group)) continue;

    let score = 50;
    const reasons: string[] = [];

    const exactGroup = donor.blood_group === request.blood_group;
    if (exactGroup) {
      score += 25;
      reasons.push('Exact blood group match');
    } else {
      score += 12;
      reasons.push(`Compatible group (${donor.blood_group} → ${request.blood_group})`);
    }

    if (donor.last_donation_date) {
      const daysSince = Math.floor((Date.now() - new Date(donor.last_donation_date).getTime()) / 86400000);
      if (daysSince >= 56) {
        score += 15;
        reasons.push('Eligible to donate (56+ days since last donation)');
      } else if (daysSince >= 30) {
        score += 5;
        reasons.push(`${daysSince} days since last donation`);
      } else {
        score -= 20;
        reasons.push(`Recently donated (${daysSince} days ago)`);
      }
    } else {
      score += 10;
      reasons.push('No recent donations on record');
    }

    let dist: number | null = null;
    if (requesterCoords && donor.latitude && donor.longitude) {
      dist = distanceKm(requesterCoords.latitude, requesterCoords.longitude, donor.latitude, donor.longitude);
      if (dist < 5) {
        score += 15;
        reasons.push(`Very close (${dist.toFixed(1)} km)`);
      } else if (dist < 20) {
        score += 8;
        reasons.push(`Nearby (${dist.toFixed(1)} km)`);
      } else if (dist > 100) {
        score -= 10;
        reasons.push(`Far away (${dist.toFixed(1)} km)`);
      }
    } else if (donor.city && request.location) {
      if (donor.city.toLowerCase() === request.location.toLowerCase()) {
        score += 12;
        reasons.push('Same city');
      }
    }

    if (donor.organ_donation_preference) {
      score += 2;
    }

    matches.push({ donor, score: Math.round(score), reasons, distanceKm: dist, exactGroup });
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * AI Donation Assistant Chatbot — rule-based responder covering blood donation,
 * organ donation, eligibility, and preparation questions.
 */
interface ChatReply {
  text: string;
  suggestions?: string[];
}

const KB: { keywords: string[]; reply: ChatReply }[] = [
  {
    keywords: ['eligib', 'who can', 'can i donate', 'age', 'weight'],
    reply: {
      text: "Most healthy adults aged 18-65 weighing at least 50kg (110 lbs) with hemoglobin above 12.5 g/dL can donate blood. You should be free of infections and feeling well. Certain conditions and medications may affect eligibility — contact your local blood bank if unsure.",
      suggestions: ['What should I do before donating?', 'How often can I donate?'],
    },
  },
  {
    keywords: ['how often', 'frequency', 'when can i again', 'interval'],
    reply: {
      text: "Whole blood: every 56 days (8 weeks). Plasma: every 28 days. Platelets: every 7 days, up to 24 times per year. Your body replaces plasma within 24 hours and red cells within 4-6 weeks.",
      suggestions: ['How long to recover?', 'Does donating hurt?'],
    },
  },
  {
    keywords: ['before', 'prepare', 'eat', 'drink', 'what should i do'],
    reply: {
      text: "Before donating: eat a healthy, non-fatty meal; drink about 500ml of water; avoid alcohol for 24 hours; get a good night's sleep; and bring a valid photo ID. Don't donate on an empty stomach.",
      suggestions: ['What happens during donation?', 'Is it safe?'],
    },
  },
  {
    keywords: ['during', 'process', 'how long', 'what happens', 'step'],
    reply: {
      text: "The process takes about an hour total. 1) Register and complete a health questionnaire. 2) Mini-physical (pulse, BP, hemoglobin). 3) Donation itself takes 8-10 minutes. 4) Rest with refreshments. About 470ml of blood is collected.",
      suggestions: ['Does it hurt?', 'How long to recover?'],
    },
  },
  {
    keywords: ['hurt', 'pain', 'needle', 'scared', 'afraid'],
    reply: {
      text: "You may feel a brief pinch when the needle goes in, but the donation itself is usually painless. The staff is trained to make you comfortable. If you feel nervous, let them know — they can help you relax.",
      suggestions: ['Is it safe?', 'What should I do before?'],
    },
  },
  {
    keywords: ['safe', 'risk', 'disease', 'infection', 'hiv'],
    reply: {
      text: "Blood donation is very safe. All equipment is sterile and single-use — you cannot contract HIV, hepatitis, or any disease from donating. Your body replaces the fluid within 24 hours.",
      suggestions: ['How often can I donate?', 'Who can donate?'],
    },
  },
  {
    keywords: ['recover', 'replace', 'how long body', 'restore'],
    reply: {
      text: "Plasma is replaced within 24 hours. Red blood cells take 4-6 weeks to fully replenish. Avoid heavy lifting for the rest of the day and drink extra fluids for 24-48 hours.",
      suggestions: ['How often can I donate?', 'What should I do before?'],
    },
  },
  {
    keywords: ['organ', 'kidney', 'liver', 'heart', 'tissue'],
    reply: {
      text: "Organ donation can save up to 8 lives. Donatable organs: kidneys, liver, heart, lungs, pancreas, intestines. Kidneys and part of the liver can be donated while living. Register your decision and inform your family.",
      suggestions: ['Does it disfigure the body?', 'Who can be an organ donor?'],
    },
  },
  {
    keywords: ['disfigure', 'funeral', 'open casket', 'body'],
    reply: {
      text: "No. Organ recovery is a careful surgical procedure that respects the body. Open-casket funerals are still possible. There is no visible disfigurement.",
      suggestions: ['Which organs can be donated?', 'How do I register?'],
    },
  },
  {
    keywords: ['tattoo', 'piercing'],
    reply: {
      text: "If done at a licensed, sterile facility, you can donate immediately. Otherwise, wait 6 months from the date of the tattoo or piercing.",
      suggestions: ['Who can donate?', 'What should I do before?'],
    },
  },
  {
    keywords: ['register', 'sign up', 'become donor', 'how do i'],
    reply: {
      text: "You can register on LifeLink! Click 'Register' in the top navigation, choose Donor, Hospital, or Blood Bank, and complete the form. For organ donation preference, toggle it in your donor profile.",
      suggestions: ['Who can donate?', 'What should I do before?'],
    },
  },
  {
    keywords: ['benefit', 'why donate', 'reason', 'good for me'],
    reply: {
      text: "Donating blood saves up to 3 lives per donation. It also gives you a free mini-health check, may reduce heart disease risk, burns ~650 calories, and provides the psychological boost of helping others.",
      suggestions: ['How often can I donate?', 'Is it safe?'],
    },
  },
  {
    keywords: ['blood group', 'type', 'compatib', 'o negative', 'universal'],
    reply: {
      text: "O- is the universal donor (can give to anyone). AB+ is the universal recipient. Compatibility matters: LifeLink's smart matching automatically finds compatible donors for each request.",
      suggestions: ['How does matching work?', 'Who can donate?'],
    },
  },
];

const FALLBACK: ChatReply = {
  text: "I'm here to help with blood and organ donation questions! You can ask me about eligibility, the donation process, preparation, safety, recovery, organ donation, or how LifeLink works.",
  suggestions: ['Who can donate blood?', 'What should I do before donating?', 'Tell me about organ donation', 'Is blood donation safe?'],
};

export function knownChatbotReply(message: string): ChatReply | null {
  const lower = message.toLowerCase();
  for (const entry of KB) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return entry.reply;
    }
  }
  return null;
}

export function chatbotReply(message: string): ChatReply {
  return knownChatbotReply(message) ?? FALLBACK;
}

export const CHATBOT_GREETING: ChatReply = {
  text: "Hi! I'm LifeLink's AI Donation Assistant. I can answer questions about blood donation, organ donation, eligibility, and how to prepare. What would you like to know?",
  suggestions: FALLBACK.suggestions,
};
