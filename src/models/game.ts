export type TransactionType =
  | 'JOB_INCOME' | 'LOAN_RECEIVED' | 'LOAN_PAYMENT'
  | 'FAMILY_LOAN_RECEIVED' | 'FAMILY_LOAN_REPAYMENT'
  | 'BUSINESS_PURCHASE' | 'BUSINESS_REVENUE' | 'BUSINESS_EXPENSE';

export interface GameDate { year: number; month: number; day: number }
export interface Player { id: string; firstName: string; lastName: string; ageAtStart: number; birthYear: number }
export interface Transaction { id: string; type: TransactionType; amount: number; gameDate: GameDate; description: string; relatedEntityId?: string }
export interface BankLoan { id: string; name: string; principal: number; apr: number; outstanding: number; monthlyPayment: number; remainingMonths: number; nextPayment: GameDate }
export interface PersonalDebt { id: string; creditorId: string; creditorName: string; amount: number; repaidAmount: number; createdAt: GameDate; status: 'ACTIVE' | 'REPAID' }
export type Demand = 'Low' | 'Medium' | 'High';
export interface MarketOffer { id: string; name: string; purchasePrice: number; marketValue: number; demand: Demand; condition: 'New' | 'Used' }
export interface InventoryItem extends MarketOffer { listedPrice?: number; listedAt?: GameDate }
export interface Sale { id: string; itemName: string; purchasePrice: number; salePrice: number; profit: number; soldAt: GameDate }
export interface Business { id: string; type: 'RESELLING'; name: string; inventory: InventoryItem[]; sales: Sale[]; cashInvested: number; revenue: number; expenses: number }
export interface Relationship { id: string; name: string; type: 'BROTHER'; trust: number; lastAskedMonth?: string }
export interface Stats { jobsCompleted: number; itemsSold: number; lifetimeIncome: number }
export interface GameState {
  schemaVersion: 1;
  player: Player;
  date: GameDate;
  cash: number;
  transactions: Transaction[];
  loans: BankLoan[];
  personalDebts: PersonalDebt[];
  relationships: Relationship[];
  businesses: Business[];
  stats: Stats;
  creditScore: number;
  settings: { haptics: boolean };
}
