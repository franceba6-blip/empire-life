import { GameState } from '@/models/game';
import { addDays } from '@/game/time/time';
import { transact } from './economy';
import { makeId } from '@/utils/id';

export const monthlyPayment = (principal: number, apr: number, months: number) => {
  const rate = apr / 100 / 12;
  return Math.round((principal * rate / (1 - Math.pow(1 + rate, -months))) * 100) / 100;
};

export function takeLoan(state: GameState, offer: { name: string; principal: number; apr: number; term: number; minScore: number }): GameState {
  if (state.creditScore < offer.minScore) throw new Error('Credit score too low');
  if (state.loans.some(l => l.outstanding > 0)) throw new Error('Only one active bank loan is allowed');
  const id = makeId('loan');
  const next = transact(state, 'LOAN_RECEIVED', offer.principal, `${offer.name} received`, id);
  return { ...next, loans: [...next.loans, { id, name: offer.name, principal: offer.principal, apr: offer.apr, outstanding: offer.principal, monthlyPayment: monthlyPayment(offer.principal, offer.apr, offer.term), remainingMonths: offer.term, nextPayment: addDays(state.date, 30) }] };
}
