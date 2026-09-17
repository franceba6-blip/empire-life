import { FAMILY_NAMES, START_DATE } from '@/config/balance';
import { FamilyMember, GiftTier, RelationType } from '@/models/game';

const profile: Record<RelationType, { score: number; trust: number; birthday: [number, number]; personality: FamilyMember['personality']; preferences: GiftTier[] }> = {
  MOTHER: { score: 74, trust: 78, birthday: [5, 14], personality: 'sentimental', preferences: ['SMALL', 'MEDIUM'] },
  FATHER: { score: 68, trust: 72, birthday: [10, 3], personality: 'practical', preferences: ['MEDIUM', 'LARGE'] },
  BROTHER: { score: 71, trust: 72, birthday: [7, 22], personality: 'quality_time', preferences: ['MEDIUM', 'LARGE'] },
  GRANDMOTHER: { score: 80, trust: 84, birthday: [2, 18], personality: 'sentimental', preferences: ['SMALL'] },
  GRANDFATHER: { score: 76, trust: 79, birthday: [11, 9], personality: 'quality_time', preferences: ['SMALL', 'MEDIUM'] }
};

export function createDefaultFamily(): FamilyMember[] {
  return (Object.keys(profile) as RelationType[]).map(relationType => {
    const p = profile[relationType];
    return {
      id: relationType.toLowerCase(), name: FAMILY_NAMES[relationType], relationType, relationshipScore: p.score, trust: p.trust,
      mood: 'Good', birthday: { month: p.birthday[0], day: p.birthday[1] }, lastDecayGameDate: { ...START_DATE },
      interactionHistory: [], giftHistory: [], financialHistory: [], memories: [], contactStatus: 'active',
      personality: p.personality, giftPreferences: p.preferences
    };
  });
}
