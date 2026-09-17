import { START_DATE, START_HOUR } from '@/config/balance';
import { createDefaultFamily } from '@/game/relationships/defaultFamily';
import { GameState } from '@/models/game';
import { makeId } from '@/utils/id';

export const createGame = (firstName: string, lastName: string, age = 18): GameState => ({
  schemaVersion: 2,
  player: { id: makeId('player'), firstName: firstName.trim(), lastName: lastName.trim(), ageAtStart: age, birthYear: START_DATE.year - age },
  date: { ...START_DATE }, hour: START_HOUR, cash: 0, transactions: [], loans: [], personalDebts: [], creditScore: 512,
  relationships: createDefaultFamily(), familyEvents: [],
  businesses: [{ id: 'reselling', type: 'RESELLING', name: 'Reselling', inventory: [], sales: [], cashInvested: 0, revenue: 0, expenses: 0 }],
  stats: { jobsCompleted: 0, itemsSold: 0, lifetimeIncome: 0 }, settings: { haptics: true }
});
