import { MarketOffer } from '@/models/game';

export const START_DATE = { year: 2026, month: 1, day: 1 } as const;
export const JOBS = [
  { id: 'delivery', name: 'Delivery Shift', durationDays: 1, minReward: 40, maxReward: 90, icon: 'bicycle' },
  { id: 'temp', name: 'Temporary Work', durationDays: 2, minReward: 70, maxReward: 150, icon: 'briefcase' },
  { id: 'freelance', name: 'Freelance Task', durationDays: 2, minReward: 50, maxReward: 200, icon: 'laptop' },
  { id: 'online', name: 'Online Reselling Task', durationDays: 1, minReward: 30, maxReward: 130, icon: 'cart' }
] as const;
export const LOAN_OFFERS = [
  { id: 'micro', name: 'Micro Loan', principal: 1000, apr: 7.9, term: 12, minScore: 450 },
  { id: 'starter', name: 'Starter Loan', principal: 5000, apr: 9.5, term: 24, minScore: 500 },
  { id: 'growth', name: 'Growth Loan', principal: 10000, apr: 12.9, term: 36, minScore: 600 }
] as const;
export const FAMILY_AMOUNTS = [500, 2000, 5000] as const;
export const MARKET_OFFERS: MarketOffer[] = [
  { id: 'headphones', name: 'Wireless Headphones', purchasePrice: 120, marketValue: 175, demand: 'High', condition: 'New' },
  { id: 'sneakers', name: 'Limited Sneakers', purchasePrice: 210, marketValue: 285, demand: 'Medium', condition: 'New' },
  { id: 'console', name: 'Game Console', purchasePrice: 320, marketValue: 390, demand: 'High', condition: 'Used' },
  { id: 'watch', name: 'Smart Watch', purchasePrice: 85, marketValue: 130, demand: 'Low', condition: 'Used' }
];
