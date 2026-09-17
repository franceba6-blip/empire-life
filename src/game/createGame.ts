import { START_DATE } from '@/config/balance';
import { GameState } from '@/models/game';
import { makeId } from '@/utils/id';

export const createGame = (firstName: string, lastName: string, age = 18): GameState => ({
  schemaVersion: 1,
  player: { id: makeId('player'), firstName: firstName.trim(), lastName: lastName.trim(), ageAtStart: age, birthYear: START_DATE.year - age },
  date: { ...START_DATE }, cash: 0, transactions: [], loans: [], personalDebts: [], creditScore: 512,
  relationships: [{ id: 'marco', name: 'Marco', type: 'BROTHER', trust: 72 }],
  businesses: [{ id: 'reselling', type: 'RESELLING', name: 'Reselling', inventory: [], sales: [], cashInvested: 0, revenue: 0, expenses: 0 }],
  stats: { jobsCompleted: 0, itemsSold: 0, lifetimeIncome: 0 }, settings: { haptics: true }
});
