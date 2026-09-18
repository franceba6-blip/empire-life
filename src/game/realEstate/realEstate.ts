import { GameDate, GameState } from "@/models/game";
import {
  transact,
  totalBankDebt,
  totalPersonalDebt,
} from "@/game/economy/economy";
import {
  addDays,
  advanceGameTime,
  dateKey,
  daysBetween,
} from "@/game/time/time";
import { makeId } from "@/utils/id";
import {
  LOCATIONS,
  MANAGEMENT_FEE,
  MARKET,
  PROPERTY_TYPES,
  RENOVATIONS,
  SALE_FEE,
} from "./config";
import {
  Property,
  PropertyType,
  RealEstateState,
  RenovationLevel,
} from "./types";
export const money = (value: number) => Math.round(value * 100) / 100;
export function generateListings(date: GameDate): Property[] {
  return (Object.keys(PROPERTY_TYPES) as PropertyType[]).map((type, i) => {
    const spec = PROPERTY_TYPES[type],
      location = LOCATIONS[(i + date.month - 1) % LOCATIONS.length];
    const condition = 58 + ((i * 7 + date.month * 3) % 35),
      value = money(spec.price * location.price * (0.75 + condition / 400));
    return {
      id: `property-${dateKey(date)}-${type}`,
      propertyType: type,
      locationId: location.id,
      size: spec.size,
      rooms: spec.residential
        ? Math.max(1, Math.round(spec.size / 35))
        : undefined,
      condition,
      purchasePrice: value,
      estimatedMarketValue: value,
      monthlyRentPotential: money(
        ((spec.price * spec.yield) / 12) * location.rent,
      ),
      monthlyOperatingCosts: money(((spec.price * 0.008) / 12) * location.cost),
      maintenanceRate: 0.006,
      renovationPotential: 100 - condition,
      occupancyState: "VACANT",
      createdAt: { ...date },
      owned: false,
      management: "SELF",
      renovationSpent: 0,
      arrears: 0,
    };
  });
}
export const initialRealEstate = (date: GameDate): RealEstateState => ({
  listings: generateListings(date),
  properties: [],
  sales: [],
  market: "NORMAL",
  lastMarketMonth: dateKey(date),
});
export const propertyDebt = (p: Property) =>
  money(
    (p.mortgage?.remainingBalance ?? 0) +
      (p.mortgage?.arrears ?? 0) +
      p.arrears,
  );
export function propertyCashflow(p: Property) {
  const gross =
    p.occupancyState === "RENTED" && !p.renovation
      ? (p.tenant?.monthlyRent ?? p.monthlyRentPotential)
      : 0;
  const operating = p.monthlyOperatingCosts,
    maintenance = money((p.estimatedMarketValue * p.maintenanceRate) / 12),
    management = money(
      gross * (p.management === "MANAGER" ? MANAGEMENT_FEE : 0),
    );
  const mortgage =
    p.mortgage && p.mortgage.remainingBalance > 0
      ? Math.min(
          p.mortgage.monthlyPayment,
          money(p.mortgage.remainingBalance * (1 + p.mortgage.apr / 1200)),
        )
      : 0;
  return {
    gross,
    operating,
    maintenance,
    management,
    mortgage,
    net: money(gross - operating - maintenance - management - mortgage),
  };
}
export function portfolio(state: GameState) {
  const props = state.realEstate.properties;
  const value = money(props.reduce((v, p) => v + p.estimatedMarketValue, 0)),
    debt = money(props.reduce((v, p) => v + propertyDebt(p), 0));
  return {
    count: props.length,
    value,
    debt,
    equity: money(value - debt),
    gross: money(props.reduce((v, p) => v + propertyCashflow(p).gross, 0)),
    net: money(props.reduce((v, p) => v + propertyCashflow(p).net, 0)),
  };
}
export function mortgagePayment(
  principal: number,
  apr: number,
  months: number,
) {
  if (
    !Number.isFinite(principal) ||
    principal <= 0 ||
    !Number.isFinite(apr) ||
    apr < 0 ||
    !Number.isInteger(months) ||
    months <= 0
  )
    throw new Error("Invalid mortgage terms");
  const rate = apr / 1200;
  return money(
    rate === 0
      ? principal / months
      : (principal * rate) / (1 - Math.pow(1 + rate, -months)),
  );
}
export function mortgageQuote(
  state: GameState,
  p: Property,
  downPercent = 20,
  termYears = 25,
) {
  if (
    !Number.isFinite(downPercent) ||
    downPercent < 20 ||
    downPercent >= 100 ||
    ![10, 15, 25, 30].includes(termYears)
  )
    throw new Error("Choose 20–99% down and a 10, 15, 25 or 30 year term");
  if (state.creditScore < 500) throw new Error("Credit score of 500 required");
  const debts =
    totalBankDebt(state) + totalPersonalDebt(state) + portfolio(state).debt;
  const collateral = state.cash + portfolio(state).value;
  if (debts > Math.max(10000, collateral * 0.85))
    throw new Error("Existing debt is too high for another mortgage");
  const downPayment = money((p.purchasePrice * downPercent) / 100),
    principal = money(p.purchasePrice - downPayment);
  const apr = money(
    4.2 +
      Math.max(0, 700 - state.creditScore) / 100 +
      Math.min(2, (debts / Math.max(1, collateral)) * 2),
  );
  return {
    principal,
    downPayment,
    apr,
    monthlyPayment: mortgagePayment(principal, apr, termYears * 12),
    remainingBalance: principal,
    termMonths: termYears * 12,
    paymentsMade: 0,
    arrears: 0,
  };
}
function owned(state: GameState, id: string) {
  const p = state.realEstate.properties.find((p) => p.id === id);
  if (!p) throw new Error("Property not owned");
  return p;
}
function replace(state: GameState, p: Property): GameState {
  return {
    ...state,
    realEstate: {
      ...state.realEstate,
      properties: state.realEstate.properties.map((x) =>
        x.id === p.id ? p : x,
      ),
    },
  };
}
export function buyProperty(
  state: GameState,
  id: string,
  finance = false,
  down = 20,
  years = 25,
): GameState {
  const p = state.realEstate.listings.find((p) => p.id === id);
  if (!p) throw new Error("Listing unavailable");
  const mortgage = finance ? mortgageQuote(state, p, down, years) : undefined;
  const next = transact(
    state,
    "PROPERTY_PURCHASE",
    mortgage?.downPayment ?? p.purchasePrice,
    finance ? "Property down payment" : "Cash property purchase",
    id,
  );
  return advanceGameTime(
    {
      ...next,
      realEstate: {
        ...next.realEstate,
        listings: next.realEstate.listings.filter((x) => x.id !== id),
        properties: [
          ...next.realEstate.properties,
          {
            ...p,
            owned: true,
            acquiredAt: { ...state.date },
            nextBillingAt: addDays(state.date, 30),
            mortgage,
          },
        ],
      },
    },
    2,
  );
}
export function moveIn(state: GameState, id: string): GameState {
  const p = owned(state, id);
  if (
    !PROPERTY_TYPES[p.propertyType].residential ||
    p.renovation ||
    p.occupancyState === "RENTED"
  )
    throw new Error("Choose a vacant residential property");
  if (state.player.homePropertyId === id) throw new Error("Already your home");
  const next = {
    ...state,
    player: { ...state.player, homePropertyId: id },
    realEstate: {
      ...state.realEstate,
      properties: state.realEstate.properties.map((x) =>
        x.id === id
          ? { ...x, occupancyState: "OWNER_OCCUPIED" as const }
          : x.occupancyState === "OWNER_OCCUPIED"
            ? { ...x, occupancyState: "VACANT" as const }
            : x,
      ),
    },
  };
  return advanceGameTime(next, 8);
}
export function rentOut(state: GameState, id: string): GameState {
  const p = owned(state, id);
  if (
    p.propertyType === "LAND" ||
    p.renovation ||
    p.occupancyState !== "VACANT"
  )
    throw new Error("Only vacant, completed buildings can be let");
  const location = LOCATIONS.find((x) => x.id === p.locationId)!;
  const next = advanceGameTime(
    state,
    Math.ceil(7 / (location.demand * MARKET[state.realEstate.market].demand)) *
      24,
  );
  return replace(next, {
    ...owned(next, id),
    occupancyState: "RENTED",
    tenant: {
      quality: 75,
      rentPaid: false,
      leaseStart: { ...next.date },
      monthlyRent: owned(next, id).monthlyRentPotential,
    },
  });
}
export function vacate(state: GameState, id: string): GameState {
  const p = owned(state, id);
  if (p.occupancyState === "VACANT") throw new Error("Already vacant");
  // Existing tenancies require a 30-day notice period; owner move-out takes eight hours.
  const next = advanceGameTime(state, p.occupancyState === "RENTED" ? 720 : 8);
  return replace(
    {
      ...next,
      player: {
        ...next.player,
        homePropertyId:
          next.player.homePropertyId === id
            ? undefined
            : next.player.homePropertyId,
      },
    },
    { ...owned(next, id), occupancyState: "VACANT", tenant: undefined },
  );
}
export function setManagement(
  state: GameState,
  id: string,
  mode: "SELF" | "MANAGER",
): GameState {
  const p = owned(state, id);
  return advanceGameTime(replace(state, { ...p, management: mode }), 1);
}
export function renovationQuote(p: Property, level: RenovationLevel) {
  const c = RENOVATIONS[level];
  if (!c) throw new Error("Unknown renovation");
  const improvement = Math.min(100 - p.condition, c.improvement),
    fraction = improvement / c.improvement;
  return {
    level,
    cost: money(Math.max(c.minimum, p.estimatedMarketValue * c.ratio)),
    days: c.days,
    improvement,
    valueGain: money(p.estimatedMarketValue * c.value * fraction),
    rentGain: money(p.monthlyRentPotential * c.rent * fraction),
  };
}
export function renovate(
  state: GameState,
  id: string,
  level: RenovationLevel,
): GameState {
  const p = owned(state, id);
  if (
    p.renovation ||
    p.condition >= 100 ||
    p.occupancyState !== "VACANT" ||
    p.propertyType === "LAND"
  )
    throw new Error(
      "Renovation requires a vacant building with room for improvement",
    );
  const q = renovationQuote(p, level),
    next = transact(
      state,
      "PROPERTY_RENOVATION",
      q.cost,
      `${level} renovation`,
      id,
    );
  return advanceGameTime(
    replace(next, {
      ...p,
      renovationSpent: money(p.renovationSpent + q.cost),
      renovation: { ...q, completesAt: addDays(state.date, q.days) },
    }),
    1,
  );
}
export function saleQuote(state: GameState, p: Property) {
  const price = money(
    p.estimatedMarketValue *
      MARKET[state.realEstate.market].sale *
      (0.95 + p.condition / 2000),
  );
  const fees = money(price * SALE_FEE),
    payoff = propertyDebt(p);
  return {
    price,
    fees,
    mortgagePayoff: payoff,
    proceeds: money(price - fees - payoff),
    profit: money(price - fees - p.purchasePrice - p.renovationSpent),
  };
}
export function sellProperty(state: GameState, id: string): GameState {
  const p = owned(state, id);
  if (p.renovation) throw new Error("Complete renovation before selling");
  const q = saleQuote(state, p);
  if (state.cash + q.price < q.fees + q.mortgagePayoff)
    throw new Error("Not enough cash to settle sale debt");
  let next = transact(state, "PROPERTY_SALE", q.price, "Property sold", id);
  if (q.fees)
    next = transact(next, "PROPERTY_EXPENSE", q.fees, "Sale fees", id);
  if (q.mortgagePayoff)
    next = transact(
      next,
      "PROPERTY_PAYMENT",
      q.mortgagePayoff,
      "Sale debt settlement",
      id,
    );
  next = {
    ...next,
    player: {
      ...next.player,
      homePropertyId:
        next.player.homePropertyId === id
          ? undefined
          : next.player.homePropertyId,
    },
    realEstate: {
      ...next.realEstate,
      properties: next.realEstate.properties.filter((x) => x.id !== id),
      sales: [
        { id: makeId("sale"), propertyId: id, soldAt: { ...state.date }, ...q },
        ...next.realEstate.sales,
      ],
    },
  };
  return advanceGameTime(next, 24);
}
export function processPropertyDay(state: GameState): GameState {
  let next = state;
  for (const original of state.realEstate.properties) {
    let p = {
      ...original,
      mortgage: original.mortgage ? { ...original.mortgage } : undefined,
      tenant: original.tenant ? { ...original.tenant } : undefined,
    };
    if (
      p.renovation &&
      daysBetween(p.renovation.completesAt, state.date) >= 0
    ) {
      const r = p.renovation;
      p = {
        ...p,
        condition: Math.min(100, p.condition + r.improvement),
        renovationPotential: Math.max(0, 100 - p.condition - r.improvement),
        estimatedMarketValue: money(p.estimatedMarketValue + r.valueGain),
        monthlyRentPotential: money(p.monthlyRentPotential + r.rentGain),
        renovation: undefined,
      };
    }
    if (p.nextBillingAt && daysBetween(p.nextBillingAt, state.date) >= 0) {
      const f = propertyCashflow(p);
      // First period is prorated from lease start, preventing full rent for a last-day tenant.
      const leasedDays = p.tenant
        ? Math.max(
            0,
            Math.min(30, daysBetween(p.tenant.leaseStart, state.date)),
          )
        : 0;
      const rent = money((f.gross * leasedDays) / 30);
      if (rent > 0)
        next = transact(next, "PROPERTY_RENT", rent, "Rental income", p.id);
      if (p.tenant) p.tenant.rentPaid = rent > 0;
      const due = money(
          f.operating +
            f.maintenance +
            rent * (p.management === "MANAGER" ? MANAGEMENT_FEE : 0) +
            p.arrears,
        ),
        paid = money(Math.min(next.cash, due));
      if (paid > 0)
        next = transact(
          next,
          "PROPERTY_EXPENSE",
          paid,
          "Operating, maintenance & management",
          p.id,
        );
      p.arrears = money(due - paid);
      if (p.mortgage && p.mortgage.remainingBalance > 0) {
        const m = p.mortgage,
          interest = money((m.remainingBalance * m.apr) / 1200),
          payment = money(Math.min(next.cash, f.mortgage + m.arrears));
        if (payment > 0)
          next = transact(
            next,
            "PROPERTY_PAYMENT",
            payment,
            "Mortgage payment",
            p.id,
          );
        const interestDue = money(interest + m.arrears),
          interestPaid = Math.min(payment, interestDue);
        m.arrears = money(interestDue - interestPaid);
        m.remainingBalance = money(
          Math.max(0, m.remainingBalance - (payment - interestPaid)),
        );
        m.paymentsMade += 1;
      }
      p.nextBillingAt = addDays(p.nextBillingAt, 30);
    }
    next = replace(next, p);
  }
  if (dateKey(state.date) !== state.realEstate.lastMarketMonth) {
    const monthIndex = state.date.year * 12 + state.date.month,
      market = (["NORMAL", "STRONG", "NORMAL", "WEAK"] as const)[
        Math.floor(monthIndex / 3) % 4
      ];
    next = {
      ...next,
      realEstate: {
        ...next.realEstate,
        market,
        lastMarketMonth: dateKey(state.date),
        listings: generateListings(state.date),
        properties: next.realEstate.properties.map((p) => ({
          ...p,
          estimatedMarketValue: money(
            p.estimatedMarketValue *
              (1 +
                MARKET[market].growth +
                LOCATIONS.find((l) => l.id === p.locationId)!.growth),
          ),
          monthlyRentPotential: money(
            p.monthlyRentPotential * MARKET[market].rent,
          ),
        })),
      },
    };
  }
  return next;
}
