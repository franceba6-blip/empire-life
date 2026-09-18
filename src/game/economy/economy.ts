import { GameState, TransactionType } from "@/models/game";
import { makeId } from "@/utils/id";

const assertMoney = (amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Amount must be a positive finite number");
};

export function transact(
  state: GameState,
  type: TransactionType,
  amount: number,
  description: string,
  relatedEntityId?: string,
): GameState {
  assertMoney(amount);
  if (type === "DEBUG_TRANSACTION")
    throw new Error("Use the isolated test money action");
  const income =
    type === "PROPERTY_SALE" ||
    type === "PROPERTY_RENT" ||
    type === "VEHICLE_SALE" ||
    type === "JOB_INCOME" ||
    type === "LOAN_RECEIVED" ||
    type === "FAMILY_LOAN_RECEIVED" ||
    type === "BUSINESS_REVENUE";
  if (!income && state.cash < amount) throw new Error("Insufficient funds");
  return {
    ...state,
    cash: Math.round((state.cash + (income ? amount : -amount)) * 100) / 100,
    transactions: [
      {
        id: makeId("tx"),
        type,
        amount,
        direction: income ? "CREDIT" : "DEBIT",
        description,
        relatedEntityId,
        gameDate: state.date,
      },
      ...state.transactions,
    ],
    stats: {
      ...state.stats,
      lifetimeIncome:
        state.stats.lifetimeIncome +
        (["JOB_INCOME", "BUSINESS_REVENUE", "PROPERTY_RENT", "VEHICLE_SALE"].includes(type)
          ? amount
          : 0),
    },
  };
}

export const totalBankDebt = (state: GameState) =>
  state.loans.reduce((sum, loan) => sum + loan.outstanding, 0);
export const totalPersonalDebt = (state: GameState) =>
  state.personalDebts.reduce(
    (sum, debt) => sum + Math.max(0, debt.amount - debt.repaidAmount),
    0,
  );
export const businessValue = (state: GameState) =>
  state.businesses.reduce(
    (sum, business) =>
      sum + business.inventory.reduce((v, item) => v + item.marketValue, 0),
    0,
  ) + state.carDealership.dealerships.reduce(
    (sum, dealership) =>
      sum + dealership.vehicles
        .filter((vehicle) => vehicle.status !== "SOLD")
        .reduce((value, vehicle) => value + vehicle.estimatedMarketValue, 0),
    0,
  );
export const netWorth = (state: GameState) =>
  Math.round(
    (state.cash +
      businessValue(state) +
      state.realEstate.properties.reduce(
        (sum, p) =>
          sum +
          p.estimatedMarketValue -
          (p.mortgage?.remainingBalance ?? 0) -
          (p.mortgage?.arrears ?? 0) -
          p.arrears,
        0,
      ) -
      totalBankDebt(state) -
      totalPersonalDebt(state)) *
      100,
  ) / 100;
export const monthlyIncome = (state: GameState) =>
  state.transactions
    .filter(
      (t) =>
        t.gameDate.year === state.date.year &&
        t.gameDate.month === state.date.month &&
        ["JOB_INCOME", "BUSINESS_REVENUE", "PROPERTY_RENT", "VEHICLE_SALE"].includes(t.type),
    )
    .reduce((s, t) => s + t.amount, 0);
export const monthlyExpenses = (state: GameState) =>
  state.transactions
    .filter(
      (t) =>
        t.gameDate.year === state.date.year &&
        t.gameDate.month === state.date.month &&
        [
          "PROPERTY_PAYMENT",
          "PROPERTY_EXPENSE",
          "PROPERTY_RENOVATION",
          "PROPERTY_PURCHASE",
          "LOAN_PAYMENT",
          "FAMILY_LOAN_REPAYMENT",
          "FAMILY_GIFT",
          "FAMILY_HELP",
          "BUSINESS_PURCHASE",
          "BUSINESS_EXPENSE",
          "DEALERSHIP_STARTUP",
          "VEHICLE_PURCHASE",
          "VEHICLE_INSPECTION",
          "VEHICLE_REPAIR",
          "VEHICLE_PREPARATION",
          "VEHICLE_HOLDING_COST",
          "DEALERSHIP_EXPANSION",
        ].includes(t.type),
    )
    .reduce((s, t) => s + t.amount, 0);

export function debugCash(
  state: GameState,
  amount: number,
  operation: "ADD" | "SET" = "ADD",
): GameState {
  if (state.mode !== "TEST")
    throw new Error("Debug money is only available in the isolated test save");
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Invalid test amount");
  const target = operation === "SET" ? amount : state.cash + amount;
  if (!Number.isSafeInteger(Math.round(target * 100)))
    throw new Error("Test amount too large");
  const delta = moneyRound(target - state.cash);
  return {
    ...state,
    cash: moneyRound(target),
    transactions: [
      {
        id: makeId("debug"),
        type: "DEBUG_TRANSACTION",
        amount: Math.abs(delta),
        direction: delta >= 0 ? "CREDIT" : "DEBIT",
        gameDate: { ...state.date },
        description: `DEBUG_TRANSACTION: ${operation} test cash`,
      },
      ...state.transactions,
    ],
  };
}
const moneyRound = (n: number) => Math.round(n * 100) / 100;
