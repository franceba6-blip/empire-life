import { GameState, TransactionType } from '@/models/game';
import { makeId } from '@/utils/id';

const assertMoney = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive finite number');
};

export function transact(state: GameState, type: TransactionType, amount: number, description: string, relatedEntityId?: string): GameState {
  assertMoney(amount);
  const income = type === 'JOB_INCOME' || type === 'LOAN_RECEIVED' || type === 'FAMILY_LOAN_RECEIVED' || type === 'BUSINESS_REVENUE';
  if (!income && state.cash < amount) throw new Error('Insufficient funds');
  return {
    ...state,
    cash: Math.round((state.cash + (income ? amount : -amount)) * 100) / 100,
    transactions: [{ id: makeId('tx'), type, amount, description, relatedEntityId, gameDate: state.date }, ...state.transactions],
    stats: { ...state.stats, lifetimeIncome: state.stats.lifetimeIncome + (income && type !== 'LOAN_RECEIVED' && type !== 'FAMILY_LOAN_RECEIVED' ? amount : 0) }
  };
}

export const totalBankDebt = (state: GameState) => state.loans.reduce((sum, loan) => sum + loan.outstanding, 0);
export const totalPersonalDebt = (state: GameState) => state.personalDebts.reduce((sum, debt) => sum + Math.max(0, debt.amount - debt.repaidAmount), 0);
export const businessValue = (state: GameState) => state.businesses.reduce((sum, business) => sum + business.inventory.reduce((v, item) => v + item.marketValue, 0), 0);
export const netWorth = (state: GameState) => Math.round((state.cash + businessValue(state) - totalBankDebt(state) - totalPersonalDebt(state)) * 100) / 100;
export const monthlyIncome = (state: GameState) => state.transactions.filter(t => t.gameDate.year === state.date.year && t.gameDate.month === state.date.month && ['JOB_INCOME', 'BUSINESS_REVENUE'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
export const monthlyExpenses = (state: GameState) => state.transactions.filter(t => t.gameDate.year === state.date.year && t.gameDate.month === state.date.month && ['LOAN_PAYMENT', 'FAMILY_LOAN_REPAYMENT', 'FAMILY_GIFT', 'FAMILY_HELP', 'BUSINESS_PURCHASE', 'BUSINESS_EXPENSE'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
