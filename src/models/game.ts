import { RealEstateState } from "@/game/realEstate/types";
import type {
  BusinessManagement,
  StaffState,
} from "@/game/employees/types";
export type TransactionType =
  | "JOB_INCOME"
  | "LOAN_RECEIVED"
  | "LOAN_PAYMENT"
  | "FAMILY_LOAN_RECEIVED"
  | "FAMILY_LOAN_REPAYMENT"
  | "FAMILY_GIFT"
  | "FAMILY_HELP"
  | "PROPERTY_PURCHASE"
  | "PROPERTY_RENT"
  | "PROPERTY_PAYMENT"
  | "PROPERTY_EXPENSE"
  | "PROPERTY_RENOVATION"
  | "PROPERTY_SALE"
  | "DEBUG_TRANSACTION"
  | "BUSINESS_PURCHASE"
  | "BUSINESS_REVENUE"
  | "BUSINESS_EXPENSE";

export interface GameDate {
  year: number;
  month: number;
  day: number;
}
export interface Player {
  homePropertyId?: string;
  id: string;
  firstName: string;
  lastName: string;
  ageAtStart: number;
  birthYear: number;
}
export interface Transaction {
  direction?: "CREDIT" | "DEBIT";
  id: string;
  type: TransactionType;
  amount: number;
  gameDate: GameDate;
  description: string;
  relatedEntityId?: string;
}
export interface BankLoan {
  id: string;
  name: string;
  principal: number;
  apr: number;
  outstanding: number;
  monthlyPayment: number;
  remainingMonths: number;
  nextPayment: GameDate;
}
export interface PersonalDebt {
  id: string;
  creditorId: string;
  creditorName: string;
  amount: number;
  repaidAmount: number;
  createdAt: GameDate;
  status: "ACTIVE" | "REPAID";
}
export type Demand = "Low" | "Medium" | "High";
export interface MarketOffer {
  id: string;
  name: string;
  purchasePrice: number;
  marketValue: number;
  demand: Demand;
  condition: "New" | "Used";
}
export interface InventoryItem extends MarketOffer {
  listedPrice?: number;
  listedAt?: GameDate;
}
export interface Sale {
  id: string;
  itemName: string;
  purchasePrice: number;
  salePrice: number;
  profit: number;
  soldAt: GameDate;
}
export interface Business {
  id: string;
  type: "RESELLING";
  name: string;
  inventory: InventoryItem[];
  sales: Sale[];
  cashInvested: number;
  revenue: number;
  expenses: number;
  productCosts: number;
  salaryExpenses: number;
  otherExpenses: number;
  management: BusinessManagement;
}

export type RelationType =
  "MOTHER" | "FATHER" | "BROTHER" | "GRANDMOTHER" | "GRANDFATHER";
export type ContactStatus = "active" | "distant" | "no_contact";
export type Mood = "Happy" | "Good" | "Neutral" | "Worried" | "Hurt";
export type InteractionType =
  | "CALL"
  | "VISIT"
  | "EAT_TOGETHER"
  | "SMALL_OUTING"
  | "FAMILY_DINNER"
  | "PARTY";
export type GiftTier = "SMALL" | "MEDIUM" | "LARGE" | "LUXURY";
export type MemoryType =
  | "CALLED"
  | "VISITED"
  | "ACTIVITY"
  | "GIFT"
  | "FINANCIAL_HELP"
  | "HELP_REFUSED"
  | "DEBT_REPAID"
  | "INACTIVE"
  | "BIRTHDAY_REMEMBERED"
  | "BIRTHDAY_FORGOTTEN";
export interface PersonMemory {
  id: string;
  type: MemoryType;
  gameDate: GameDate;
  importance: 1 | 2 | 3;
  text: string;
  metadata?: Record<string, string | number | boolean>;
}
export interface InteractionRecord {
  id: string;
  type: InteractionType;
  gameDate: GameDate;
  gameHour: number;
  cost: number;
  timeHours: number;
  relationshipEffect: number;
  moodEffect: number;
}
export interface GiftRecord {
  id: string;
  tier: GiftTier;
  itemName: string;
  cost: number;
  gameDate: GameDate;
  relationshipEffect: number;
}
export interface FinancialRecord {
  id: string;
  direction: "TO_PLAYER" | "TO_FAMILY";
  kind: "GIFT" | "LOAN";
  amount: number;
  gameDate: GameDate;
  dueDate?: GameDate;
  status: "GIVEN" | "ACTIVE" | "REPAID";
}
export interface FamilyMember {
  id: string;
  name: string;
  relationType: RelationType;
  relationshipScore: number;
  trust: number;
  mood: Mood;
  birthday: { month: number; day: number };
  lastInteractionGameDate?: GameDate;
  lastDecayGameDate: GameDate;
  interactionHistory: InteractionRecord[];
  giftHistory: GiftRecord[];
  financialHistory: FinancialRecord[];
  memories: PersonMemory[];
  contactStatus: ContactStatus;
  personality: "sentimental" | "practical" | "quality_time" | "status";
  giftPreferences: GiftTier[];
  lastAskedMonth?: string;
}
export type FamilyEventType =
  "MONEY_REQUEST" | "DINNER_INVITE" | "VISIT_REQUEST" | "BIRTHDAY";
export interface FamilyEvent {
  id: string;
  type: FamilyEventType;
  memberId: string;
  title: string;
  description: string;
  gameDate: GameDate;
  amount?: number;
  status: "OPEN" | "ACCEPTED" | "DECLINED" | "IGNORED";
  decisionGameDate?: GameDate;
}
export interface Stats {
  jobsCompleted: number;
  itemsSold: number;
  lifetimeIncome: number;
}
export interface GameState {
  schemaVersion: 4;
  realEstate: RealEstateState;
  mode: "NORMAL" | "TEST";
  player: Player;
  date: GameDate;
  hour: number;
  cash: number;
  transactions: Transaction[];
  loans: BankLoan[];
  personalDebts: PersonalDebt[];
  relationships: FamilyMember[];
  familyEvents: FamilyEvent[];
  businesses: Business[];
  staff: StaffState;
  stats: Stats;
  creditScore: number;
  settings: { haptics: boolean };
}
