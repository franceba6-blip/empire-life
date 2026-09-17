import { GameState } from '@/models/game';
import { dateKey } from '@/game/time/time';
import { transact } from '@/game/economy/economy';
import { makeId } from '@/utils/id';

export function askBrother(state: GameState, amount: number, roll = Math.random()): { state: GameState; approved: boolean; message: string } {
  const brother = state.relationships.find(r => r.type === 'BROTHER')!;
  if (brother.lastAskedMonth === dateKey(state.date)) return { state, approved: false, message: 'Marco needs space. Try again next month.' };
  const chance = Math.max(0.08, Math.min(0.9, brother.trust / 100 - amount / 10000));
  const updatedRelationship = state.relationships.map(r => r.id === brother.id ? { ...r, lastAskedMonth: dateKey(state.date), trust: Math.max(0, r.trust - 4) } : r);
  if (roll > chance) return { state: { ...state, relationships: updatedRelationship }, approved: false, message: 'Marco cannot help this time.' };
  const id = makeId('personal_debt');
  let next = transact({ ...state, relationships: updatedRelationship }, 'FAMILY_LOAN_RECEIVED', amount, `Loan from Marco`, id);
  next = { ...next, personalDebts: [...next.personalDebts, { id, creditorId: brother.id, creditorName: brother.name, amount, repaidAmount: 0, createdAt: state.date, status: 'ACTIVE' }] };
  return { state: next, approved: true, message: `Marco lent you €${amount.toLocaleString()}. Pay him back.` };
}

export function repayBrother(state: GameState, debtId: string, amount: number): GameState {
  const debt = state.personalDebts.find(d => d.id === debtId);
  if (!debt) throw new Error('Debt not found');
  const remaining = debt.amount - debt.repaidAmount;
  const paid = Math.min(amount, remaining);
  let next = transact(state, 'FAMILY_LOAN_REPAYMENT', paid, `Repaid ${debt.creditorName}`, debtId);
  next = { ...next, personalDebts: next.personalDebts.map(d => d.id === debtId ? { ...d, repaidAmount: d.repaidAmount + paid, status: d.repaidAmount + paid >= d.amount ? 'REPAID' : 'ACTIVE' } : d), relationships: next.relationships.map(r => r.id === debt.creditorId ? { ...r, trust: Math.min(100, r.trust + 3) } : r) };
  return next;
}
