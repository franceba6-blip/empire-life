import { GiftTier, InteractionType, MarketOffer, RelationType } from '@/models/game';

export const START_DATE = { year: 2026, month: 1, day: 1 } as const;
export const START_HOUR = 8;
export const JOBS = [
  { id: 'delivery', name: 'Delivery Job', timeHours: 6, minReward: 40, maxReward: 90, icon: 'bicycle', risk: 'Low' },
  { id: 'temp', name: 'Temporary Work', timeHours: 24, minReward: 70, maxReward: 150, icon: 'briefcase', risk: 'Low' },
  { id: 'freelance', name: 'Freelance Task', timeHours: 8, minReward: 50, maxReward: 200, icon: 'laptop', risk: 'Variable' },
  { id: 'online', name: 'Online Reselling Task', timeHours: 5, minReward: 30, maxReward: 130, icon: 'cart', risk: 'Low' }
] as const;
export const LOAN_OFFERS = [
  { id: 'micro', name: 'Micro Loan', principal: 1000, apr: 7.9, term: 12, minScore: 450 },
  { id: 'starter', name: 'Starter Loan', principal: 5000, apr: 9.5, term: 24, minScore: 500 },
  { id: 'growth', name: 'Growth Loan', principal: 10000, apr: 12.9, term: 36, minScore: 600 }
] as const;
export const FAMILY_AMOUNTS = [500, 2000, 5000] as const;
export const FAMILY_NAMES: Record<RelationType, string> = { MOTHER: 'Elena', FATHER: 'Antonio', BROTHER: 'Marco', GRANDMOTHER: 'Rosa', GRANDFATHER: 'Giuseppe' };
export const FAMILY_INTERACTIONS: Record<InteractionType, { label: string; cost: number; timeHours: number; relationship: number; mood: number; cooldownHours: number }> = {
  CALL: { label: 'Call', cost: 0, timeHours: 1, relationship: 2, mood: 1, cooldownHours: 24 },
  VISIT: { label: 'Visit', cost: 10, timeHours: 3, relationship: 5, mood: 2, cooldownHours: 48 },
  EAT_TOGETHER: { label: 'Eat Together', cost: 65, timeHours: 3, relationship: 6, mood: 3, cooldownHours: 72 },
  SMALL_OUTING: { label: 'Small Outing', cost: 120, timeHours: 4, relationship: 7, mood: 4, cooldownHours: 96 },
  FAMILY_DINNER: { label: 'Family Dinner', cost: 250, timeHours: 5, relationship: 9, mood: 5, cooldownHours: 168 },
  PARTY: { label: 'Party / Celebration', cost: 900, timeHours: 8, relationship: 12, mood: 8, cooldownHours: 336 }
};
export const GIFTS: Record<GiftTier, { label: string; itemName: string; cost: number; baseEffect: number }> = {
  SMALL: { label: 'Small', itemName: 'Flowers & chocolate', cost: 35, baseEffect: 3 },
  MEDIUM: { label: 'Medium', itemName: 'Dinner voucher', cost: 180, baseEffect: 6 },
  LARGE: { label: 'Large', itemName: 'Weekend experience', cost: 1200, baseEffect: 9 },
  LUXURY: { label: 'Luxury', itemName: 'Luxury holiday support', cost: 6500, baseEffect: 12 }
};
export const RELATIONSHIP_DECAY = { graceDays: 45, intervalDays: 30, distantDays: 60, noContactDays: 120, maxPerAdvance: 3 } as const;
export const MARKET_OFFERS: MarketOffer[] = [
  { id: 'headphones', name: 'Wireless Headphones', purchasePrice: 120, marketValue: 175, demand: 'High', condition: 'New' },
  { id: 'sneakers', name: 'Limited Sneakers', purchasePrice: 210, marketValue: 285, demand: 'Medium', condition: 'New' },
  { id: 'console', name: 'Game Console', purchasePrice: 320, marketValue: 390, demand: 'High', condition: 'Used' },
  { id: 'watch', name: 'Smart Watch', purchasePrice: 85, marketValue: 130, demand: 'Low', condition: 'Used' }
];
