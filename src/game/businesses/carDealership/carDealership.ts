import { DEALERSHIP_TASKS } from "@/game/employees/config";
import {
  defaultManagement,
  generateCandidates,
  hireEmployee,
} from "@/game/employees/employees";
import { transact } from "@/game/economy/economy";
import { advanceGameTime } from "@/game/time/time";
import type { Employee, StaffTask } from "@/game/employees/types";
import type { Business, GameDate, GameState } from "@/models/game";
import { makeId } from "@/utils/id";
import { DEALERSHIP_TIERS, EXPANSIONS, PREPARATIONS, REPAIRS } from "./config";
import { generateCustomers, generateVehicleMarket } from "./market";
import type {
  CarDealership,
  CarDealershipState,
  DealershipFinancials,
  DealershipTier,
  PreparationLevel,
  PriceStrategy,
  RepairLevel,
  Vehicle,
} from "./types";
import { recommendedPriceRange, valueVehicle } from "./valuation";

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const addDays = (date: GameDate, days: number): GameDate => {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
};
const daysBetween = (from: GameDate, to: GameDate) =>
  Math.floor((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000);
const vehicleName = (vehicle: Vehicle) => `${vehicle.brand} ${vehicle.model} ${vehicle.modelVariant}`;
const history = (state: GameState, type: Vehicle["history"][number]["type"], description: string) => ({ id: makeId("vehicle-history"), type, gameDate: { ...state.date }, description });
const emptyFinancials = (): DealershipFinancials => ({ revenue: 0, vehiclePurchaseCost: 0, repairCost: 0, preparationCost: 0, holdingCost: 0, expansionCost: 0 });

export function initialCarDealershipState(date: GameDate): CarDealershipState {
  return {
    dealerships: [],
    marketOffers: generateVehicleMarket(date, 0, "NORMAL"),
    marketState: "NORMAL",
    marketGeneration: 0,
    lastMarketRefresh: { ...date },
    categoryTrends: { SUV: "HIGH", SPORTS_CAR: "LOW", LUXURY: "HIGH" },
    activeCustomers: generateCustomers(date, "NORMAL"),
    events: [],
  };
}

const getDealership = (state: GameState, dealershipId: string) => {
  const dealership = state.carDealership.dealerships.find((item) => item.id === dealershipId);
  if (!dealership) throw new Error("Dealership not found");
  return dealership;
};
const replaceDealership = (state: GameState, dealership: CarDealership): GameState => ({
  ...state,
  carDealership: {
    ...state.carDealership,
    dealerships: state.carDealership.dealerships.map((item) => item.id === dealership.id ? dealership : item),
  },
});
const updateVehicle = (state: GameState, dealershipId: string, vehicleId: string, update: (vehicle: Vehicle) => Vehicle) => {
  const dealership = getDealership(state, dealershipId);
  if (!dealership.vehicles.some((item) => item.id === vehicleId)) throw new Error("Vehicle not found");
  return replaceDealership(state, { ...dealership, vehicles: dealership.vehicles.map((item) => item.id === vehicleId ? update(item) : item) });
};

export function openDealership(state: GameState, tier: DealershipTier, name = "Empire Motors"): GameState {
  if (state.carDealership.dealerships.length) throw new Error("A dealership is already open");
  const config = DEALERSHIP_TIERS[tier];
  const dealershipId = makeId("dealership"), businessId = makeId("business");
  let next = transact(state, "DEALERSHIP_STARTUP", config.startupCost, `${config.label} startup`, dealershipId);
  const management = defaultManagement();
  management.delegations = DEALERSHIP_TASKS.map((task) => ({ task, mode: "SELF" }));
  const business: Business = {
    id: businessId,
    type: "CAR_DEALERSHIP",
    name,
    inventory: [],
    sales: [],
    cashInvested: config.startupCost,
    revenue: 0,
    expenses: config.startupCost,
    productCosts: 0,
    salaryExpenses: 0,
    otherExpenses: config.startupCost,
    management,
  };
  const dealership: CarDealership = {
    id: dealershipId,
    businessId,
    name,
    tier,
    reputation: config.reputation,
    capacity: config.capacity,
    showroomLevel: tier === "PREMIUM" ? 3 : tier === "MEDIUM" ? 2 : 1,
    workshopLevel: tier === "SMALL" ? 0 : 1,
    officeLevel: 1,
    loungeLevel: tier === "PREMIUM" ? 2 : 0,
    premiumShowroom: tier === "PREMIUM",
    locations: [{ id: makeId("location"), name: "Central Showroom", capacity: config.capacity, localDemand: 65, reputation: config.reputation, isPrimary: true }],
    vehicles: [], sales: [], financials: emptyFinancials(), expansions: [], createdAt: { ...state.date },
  };
  return advanceGameTime({ ...next, businesses: [...next.businesses, business], carDealership: { ...next.carDealership, dealerships: [dealership] } }, 24);
}

export function inspectVehicle(state: GameState, offerId: string, employeeId?: string): GameState {
  const offer = state.carDealership.marketOffers.find((item) => item.id === offerId);
  if (!offer) throw new Error("Market offer not found");
  const employee = employeeId ? state.staff.employees.find((item) => item.id === employeeId) : undefined;
  const accuracy = clamp(employee ? 65 + employee.skill * 0.32 : 78);
  const cost = employee?.role === "MECHANIC" ? 120 : 280;
  let next = transact(state, "VEHICLE_INSPECTION", cost, `Inspection: ${vehicleName(offer)}`, offer.id);
  next = { ...next, carDealership: { ...next.carDealership, marketOffers: next.carDealership.marketOffers.map((item) => item.id === offerId ? { ...item, inspected: true, inspectionAccuracy: accuracy, repairNeed: Math.round(item.hiddenRepairNeed * accuracy / 100), accidentHistoryKnown: accuracy >= 72, history: [history(next, "INSPECTED", `Inspection completed with ${accuracy}% accuracy`), ...item.history] } : item) } };
  return advanceGameTime(next, 3);
}

export type NegotiationOutcome = "ACCEPT" | "COUNTER" | "REJECT";
export function negotiateVehicle(state: GameState, offerId: string, offerAmount: number, employeeId?: string): { state: GameState; outcome: NegotiationOutcome; counterOffer?: number } {
  const vehicle = state.carDealership.marketOffers.find((item) => item.id === offerId);
  if (!vehicle) throw new Error("Market offer not found");
  if (!Number.isFinite(offerAmount) || offerAmount <= 0 || offerAmount > vehicle.sellerPrice) throw new Error("Invalid offer");
  const buyer = employeeId ? state.staff.employees.find((item) => item.id === employeeId) : undefined;
  const skill = buyer ? buyer.skill + (buyer.traits.includes("NEGOTIATOR") ? 10 : 0) : 50;
  const discount = (vehicle.sellerPrice - offerAmount) / vehicle.sellerPrice * 100;
  const tolerance = 4 + vehicle.sellerPatience * 0.08 + skill * 0.055 - (vehicle.demand === "HIGH" ? 4 : vehicle.demand === "LOW" ? -3 : 0);
  const outcome: NegotiationOutcome = discount <= tolerance ? "ACCEPT" : discount <= tolerance + 7 ? "COUNTER" : "REJECT";
  const counterOffer = outcome === "COUNTER" ? Math.round((vehicle.sellerPrice * (1 - tolerance / 100 / 2)) / 100) * 100 : undefined;
  let next: GameState = { ...state, carDealership: { ...state.carDealership, marketOffers: state.carDealership.marketOffers.map((item) => item.id === offerId ? { ...item, sellerPrice: outcome === "ACCEPT" ? offerAmount : counterOffer ?? item.sellerPrice, history: [history(state, "NEGOTIATED", `${outcome}: offer €${offerAmount}`), ...item.history] } : item) } };
  next = advanceGameTime(next, 1);
  return { state: next, outcome, counterOffer };
}

export function buyVehicle(state: GameState, dealershipId: string, offerId: string): GameState {
  const dealership = getDealership(state, dealershipId);
  const active = dealership.vehicles.filter((item) => item.status !== "SOLD").length;
  if (active >= dealership.capacity) throw new Error("Showroom capacity reached");
  const offer = state.carDealership.marketOffers.find((item) => item.id === offerId);
  if (!offer) throw new Error("Market offer not found");
  let next = transact(state, "VEHICLE_PURCHASE", offer.sellerPrice, `Purchased ${vehicleName(offer)}`, offer.id);
  const owned: Vehicle = { ...offer, dealershipId, purchasePrice: offer.sellerPrice, status: "PURCHASED", daysInStock: 0, history: [history(next, "PURCHASED", `Purchased for €${offer.sellerPrice}`), ...offer.history] };
  const updated = { ...dealership, vehicles: [...dealership.vehicles, owned], financials: { ...dealership.financials, vehiclePurchaseCost: dealership.financials.vehiclePurchaseCost + offer.sellerPrice } };
  next = { ...replaceDealership(next, updated), carDealership: { ...next.carDealership, dealerships: next.carDealership.dealerships.map((item) => item.id === dealership.id ? updated : item), marketOffers: next.carDealership.marketOffers.filter((item) => item.id !== offerId) }, businesses: next.businesses.map((business) => business.id === dealership.businessId ? { ...business, cashInvested: business.cashInvested + offer.sellerPrice, expenses: business.expenses + offer.sellerPrice, productCosts: business.productCosts + offer.sellerPrice } : business) };
  return advanceGameTime(next, 2);
}

const bestEmployee = (state: GameState, businessId: string, roles: Employee["role"][]) => state.staff.employees.filter((item) => item.businessId === businessId && roles.includes(item.role)).sort((a, b) => b.performance - a.performance)[0];

export function repairVehicle(state: GameState, dealershipId: string, vehicleId: string, level: RepairLevel): GameState {
  const dealership = getDealership(state, dealershipId), vehicle = dealership.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status === "SOLD") throw new Error("Vehicle unavailable");
  if (vehicle.workOrder) throw new Error("Work is already in progress");
  const mechanic = bestEmployee(state, dealership.businessId, ["MECHANIC"]), config = REPAIRS[level];
  const skill = mechanic?.skill ?? 45;
  const cost = Math.round(config.baseCost * (1.12 - skill * 0.0025) * (0.75 + vehicle.hiddenRepairNeed / 70));
  const days = Math.max(1, Math.ceil(config.days * (1.25 - skill * 0.005)));
  let next = transact(state, "VEHICLE_REPAIR", cost, `${level} repair: ${vehicleName(vehicle)}`, vehicle.id);
  next = updateVehicle(next, dealershipId, vehicleId, (item) => ({ ...item, status: "IN_REPAIR", repairCost: item.repairCost + cost, workOrder: { kind: "REPAIR", level, cost, startedAt: { ...next.date }, completesAt: addDays(next.date, days), mechanicalGain: config.gain + Math.round(skill / 18), cosmeticGain: 0, valueGain: Math.round(cost * config.valueFactor) }, history: [history(next, "REPAIR_STARTED", `${level} repair started · €${cost} · ${days} days`), ...item.history] }));
  const current = getDealership(next, dealershipId);
  return replaceDealership({ ...next, businesses: next.businesses.map((business) => business.id === dealership.businessId ? { ...business, expenses: business.expenses + cost, otherExpenses: business.otherExpenses + cost } : business) }, { ...current, financials: { ...current.financials, repairCost: current.financials.repairCost + cost } });
}

export function prepareVehicle(state: GameState, dealershipId: string, vehicleId: string, level: PreparationLevel): GameState {
  const dealership = getDealership(state, dealershipId), vehicle = dealership.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status === "SOLD") throw new Error("Vehicle unavailable");
  if (vehicle.workOrder) throw new Error("Work is already in progress");
  const detailer = bestEmployee(state, dealership.businessId, ["DETAILER"]), config = PREPARATIONS[level];
  const skill = detailer?.skill ?? 45, cost = Math.round(config.cost * (1.1 - skill * 0.002)), days = Math.max(1, Math.ceil(config.days * (1.2 - skill * 0.0045)));
  let next = transact(state, "VEHICLE_PREPARATION", cost, `${level}: ${vehicleName(vehicle)}`, vehicle.id);
  next = updateVehicle(next, dealershipId, vehicleId, (item) => ({ ...item, status: "IN_REPAIR", preparationCost: item.preparationCost + cost, workOrder: { kind: "PREPARATION", level, cost, startedAt: { ...next.date }, completesAt: addDays(next.date, days), mechanicalGain: 0, cosmeticGain: config.gain + Math.round(skill / 20), valueGain: Math.round(cost * config.valueFactor) }, history: [history(next, "PREPARATION_STARTED", `${level} started · €${cost} · ${days} days`), ...item.history] }));
  const current = getDealership(next, dealershipId);
  return replaceDealership({ ...next, businesses: next.businesses.map((business) => business.id === dealership.businessId ? { ...business, expenses: business.expenses + cost, otherExpenses: business.otherExpenses + cost } : business) }, { ...current, financials: { ...current.financials, preparationCost: current.financials.preparationCost + cost } });
}

export function listVehicle(state: GameState, dealershipId: string, vehicleId: string, strategy: PriceStrategy, customPrice?: number): GameState {
  const dealership = getDealership(state, dealershipId), vehicle = dealership.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status === "SOLD" || vehicle.status === "IN_REPAIR") throw new Error("Vehicle cannot be listed");
  const ranges = recommendedPriceRange(vehicle);
  const askingPrice = strategy === "FAST_SALE" ? ranges.low : strategy === "MARKET_PRICE" ? vehicle.estimatedMarketValue : strategy === "MAX_PROFIT" ? ranges.high : customPrice;
  if (!askingPrice || !Number.isFinite(askingPrice) || askingPrice <= 0) throw new Error("Invalid asking price");
  return updateVehicle(state, dealershipId, vehicleId, (item) => ({ ...item, askingPrice: Math.round(askingPrice), priceStrategy: strategy, status: "LISTED", listedAt: { ...state.date }, history: [history(state, item.askingPrice ? "PRICE_CHANGED" : "LISTED", `${strategy}: €${Math.round(askingPrice)}`), ...item.history] }));
}

export function removeVehicleListing(state: GameState, dealershipId: string, vehicleId: string): GameState {
  return updateVehicle(state, dealershipId, vehicleId, (item) => {
    if (item.status !== "LISTED") throw new Error("Vehicle is not listed");
    return { ...item, status: "READY_FOR_SALE", askingPrice: undefined, priceStrategy: undefined };
  });
}

export function sellVehicle(state: GameState, dealershipId: string, vehicleId: string, salePrice?: number): GameState {
  const dealership = getDealership(state, dealershipId), vehicle = dealership.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle || vehicle.status !== "LISTED") throw new Error("Vehicle is not listed for sale");
  if (dealership.sales.some((sale) => sale.vehicleId === vehicleId)) throw new Error("Vehicle was already sold");
  const price = Math.round(salePrice ?? vehicle.askingPrice ?? vehicle.estimatedMarketValue);
  let next = transact(state, "VEHICLE_SALE", price, `Sold ${vehicleName(vehicle)}`, vehicle.id);
  const totalCost = vehicle.purchasePrice + vehicle.repairCost + vehicle.preparationCost + vehicle.holdingCost;
  const sale = { id: makeId("vehicle-sale"), vehicleId, vehicleName: vehicleName(vehicle), salePrice: price, totalCost, profit: price - totalCost, soldAt: { ...next.date }, daysToSell: vehicle.daysInStock };
  const current = getDealership(next, dealershipId);
  next = replaceDealership(next, { ...current, reputation: clamp(current.reputation + (price <= vehicle.estimatedMarketValue * 1.04 ? 1 : -0.5)), vehicles: current.vehicles.map((item) => item.id === vehicleId ? { ...item, status: "SOLD", salePrice: price, soldAt: { ...next.date }, history: [history(next, "SOLD", `Sold for €${price}`), ...item.history] } : item), sales: [sale, ...current.sales], financials: { ...current.financials, revenue: current.financials.revenue + price } });
  return { ...next, businesses: next.businesses.map((business) => business.id === dealership.businessId ? { ...business, revenue: business.revenue + price } : business), stats: { ...next.stats, itemsSold: next.stats.itemsSold + 1 } };
}

export function expandDealership(state: GameState, dealershipId: string, type: keyof typeof EXPANSIONS): GameState {
  const dealership = getDealership(state, dealershipId), config = EXPANSIONS[type];
  if (dealership.expansions.some((item) => item.type === type && !item.completed)) throw new Error("Expansion already in progress");
  let next = transact(state, "DEALERSHIP_EXPANSION", config.cost, `${type} expansion`, dealershipId);
  const expansion = { id: makeId("expansion"), type, level: 1, cost: config.cost, startedAt: { ...state.date }, completesAt: addDays(state.date, config.days), completed: false };
  const current = getDealership(next, dealershipId);
  next = replaceDealership(next, { ...current, expansions: [...current.expansions, expansion], financials: { ...current.financials, expansionCost: current.financials.expansionCost + config.cost } });
  return { ...next, businesses: next.businesses.map((business) => business.id === dealership.businessId ? { ...business, expenses: business.expenses + config.cost, otherExpenses: business.otherExpenses + config.cost } : business) };
}

export function dealershipReport(state: GameState, dealershipId: string) {
  const dealership = getDealership(state, dealershipId), business = state.businesses.find((item) => item.id === dealership.businessId)!;
  const inventory = dealership.vehicles.filter((item) => item.status !== "SOLD"), inventoryValue = inventory.reduce((sum, item) => sum + item.estimatedMarketValue, 0);
  const grossProfit = dealership.financials.revenue - dealership.financials.vehiclePurchaseCost;
  const netProfit = grossProfit - dealership.financials.repairCost - dealership.financials.preparationCost - dealership.financials.holdingCost - dealership.financials.expansionCost - business.salaryExpenses;
  return { inventoryValue, grossProfit, netProfit, salaries: business.salaryExpenses, averageMargin: dealership.sales.length ? dealership.sales.reduce((sum, sale) => sum + sale.profit / Math.max(1, sale.totalCost) * 100, 0) / dealership.sales.length : 0, averageDaysToSell: dealership.sales.length ? dealership.sales.reduce((sum, sale) => sum + sale.daysToSell, 0) / dealership.sales.length : 0, ...dealership.financials };
}

const hasDelegation = (state: GameState, businessId: string, task: StaffTask) => state.businesses.find((item) => item.id === businessId)?.management.delegations.some((item) => item.task === task && item.mode !== "SELF");
const deterministicRoll = (date: GameDate, text: string) => Math.abs(Math.sin(date.year * 31 + date.month * 17 + date.day * 13 + text.length * 19)) % 1;

export function dealershipSaleChance(
  state: GameState,
  dealershipId: string,
  vehicleId: string,
): number {
  const dealership = getDealership(state, dealershipId);
  const vehicle = dealership.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("Vehicle not found");
  const salesperson = bestEmployee(state, dealership.businessId, ["SALESPERSON", "SALES_MANAGER", "DEALERSHIP_MANAGER"]);
  const priceRatio = (vehicle.askingPrice ?? vehicle.estimatedMarketValue) / vehicle.estimatedMarketValue;
  const demand = vehicle.demand === "HIGH" ? 0.18 : vehicle.demand === "LOW" ? -0.1 : 0;
  const matchingCustomers = state.carDealership.activeCustomers.filter(
    (customer) =>
      customer.categoryPreference === vehicle.category &&
      customer.budget >= (vehicle.askingPrice ?? vehicle.estimatedMarketValue) &&
      customer.qualityPreference <= vehicle.condition + 12,
  ).length;
  return clamp(20 + matchingCustomers * 5 + demand * 100 + dealership.reputation * 0.25 + (salesperson?.performance ?? 45) * 0.2 + vehicle.condition * 0.12 - Math.max(0, priceRatio - 1) * 180, 2, 88) / 100;
}

function processDealershipAutomation(state: GameState, dealership: CarDealership): GameState {
  const business = state.businesses.find((item) => item.id === dealership.businessId);
  if (!business || !business.management.automationEfficiency) return state;
  let next = state;
  const active = dealership.vehicles.filter((item) => item.status !== "SOLD").length;
  if (active < dealership.capacity && (hasDelegation(next, dealership.businessId, "VEHICLE_BUYING") || business.management.mode === "FULLY_MANAGED")) {
    const offer = [...next.carDealership.marketOffers].filter((item) => item.estimatedMarketValue > item.sellerPrice * 1.08).sort((a, b) => (b.estimatedMarketValue - b.sellerPrice) - (a.estimatedMarketValue - a.sellerPrice))[0];
    if (offer && next.cash > offer.sellerPrice * 1.3) next = buyVehicle(next, dealership.id, offer.id);
  }
  let current = getDealership(next, dealership.id);
  const repair = current.vehicles.find((item) => ["PURCHASED", "READY_FOR_SALE"].includes(item.status) && item.hiddenRepairNeed > 12 && !item.workOrder);
  if (repair && (hasDelegation(next, dealership.businessId, "VEHICLE_REPAIR") || business.management.mode === "FULLY_MANAGED") && next.cash > 5_000) return repairVehicle(next, dealership.id, repair.id, repair.hiddenRepairNeed > 35 ? "MEDIUM" : "SMALL");
  const prep = current.vehicles.find((item) => ["PURCHASED", "READY_FOR_SALE"].includes(item.status) && item.cosmeticCondition < 84 && !item.workOrder);
  if (prep && (hasDelegation(next, dealership.businessId, "VEHICLE_PREPARATION") || business.management.mode === "FULLY_MANAGED") && next.cash > 1_000) return prepareVehicle(next, dealership.id, prep.id, "DETAILING");
  const ready = current.vehicles.find((item) => ["PURCHASED", "READY_FOR_SALE"].includes(item.status) && !item.workOrder);
  if (ready && (hasDelegation(next, dealership.businessId, "VEHICLE_LISTING") || business.management.mode === "FULLY_MANAGED")) next = listVehicle(next, dealership.id, ready.id, business.management.automationEfficiency >= 90 ? "MAX_PROFIT" : "MARKET_PRICE");
  return next;
}

export function processCarDealershipDay(state: GameState): GameState {
  let next = {
    ...state,
    carDealership: {
      ...state.carDealership,
      activeCustomers: generateCustomers(state.date, state.carDealership.marketState),
    },
  };
  if (daysBetween(next.carDealership.lastMarketRefresh, next.date) >= 7) {
    const generation = next.carDealership.marketGeneration + 1;
    next = { ...next, carDealership: { ...next.carDealership, marketGeneration: generation, lastMarketRefresh: { ...next.date }, marketOffers: generateVehicleMarket(next.date, generation, next.carDealership.marketState) } };
  }
  for (const original of next.carDealership.dealerships) {
    let dealership = getDealership(next, original.id);
    const completedExpansions = dealership.expansions.filter((item) => !item.completed && daysBetween(item.completesAt, next.date) >= 0);
    if (completedExpansions.length) {
      dealership = { ...dealership, capacity: dealership.capacity + completedExpansions.reduce((sum, item) => sum + EXPANSIONS[item.type].capacity, 0), showroomLevel: dealership.showroomLevel + completedExpansions.filter((item) => item.type === "SHOWROOM" || item.type === "PREMIUM_SHOWROOM").length, workshopLevel: dealership.workshopLevel + completedExpansions.filter((item) => item.type === "WORKSHOP").length, officeLevel: dealership.officeLevel + completedExpansions.filter((item) => item.type === "OFFICE").length, loungeLevel: dealership.loungeLevel + completedExpansions.filter((item) => item.type === "CUSTOMER_LOUNGE").length, premiumShowroom: dealership.premiumShowroom || completedExpansions.some((item) => item.type === "PREMIUM_SHOWROOM"), locations: completedExpansions.some((item) => item.type === "SECOND_LOCATION") ? [...dealership.locations, { id: makeId("location"), name: `Location ${dealership.locations.length + 1}`, capacity: 25, localDemand: 62, reputation: dealership.reputation, isPrimary: false }] : dealership.locations, expansions: dealership.expansions.map((item) => completedExpansions.some((done) => done.id === item.id) ? { ...item, completed: true } : item) };
    }
    dealership = { ...dealership, vehicles: dealership.vehicles.map((vehicle) => {
      if (vehicle.status === "SOLD") return vehicle;
      let updated = { ...vehicle, daysInStock: vehicle.daysInStock + 1 };
      if (updated.workOrder && daysBetween(updated.workOrder.completesAt, next.date) >= 0) {
        const work = updated.workOrder, mechanicalCondition = clamp(updated.mechanicalCondition + work.mechanicalGain), cosmeticCondition = clamp(updated.cosmeticCondition + work.cosmeticGain);
        updated = { ...updated, status: "READY_FOR_SALE", mechanicalCondition, cosmeticCondition, condition: Math.round((mechanicalCondition + cosmeticCondition) / 2), repairNeed: Math.max(0, updated.repairNeed - work.mechanicalGain), hiddenRepairNeed: Math.max(0, updated.hiddenRepairNeed - work.mechanicalGain), estimatedMarketValue: valueVehicle({ ...updated, mechanicalCondition, cosmeticCondition }, next.carDealership.marketState, next.date.year) + work.valueGain, workOrder: undefined, history: [history(next, work.kind === "REPAIR" ? "REPAIR_COMPLETED" : "PREPARATION_COMPLETED", `${work.level} completed`), ...updated.history] };
      }
      return updated;
    }) };
    if (next.date.day === 1) {
      const activeCount = dealership.vehicles.filter((item) => item.status !== "SOLD").length, holding = activeCount * 90;
      if (holding && next.cash >= holding) {
        next = transact(next, "VEHICLE_HOLDING_COST", holding, `${dealership.name} stock holding costs`, dealership.id);
        dealership = { ...dealership, vehicles: dealership.vehicles.map((item) => item.status === "SOLD" ? item : { ...item, holdingCost: item.holdingCost + 90 }), financials: { ...dealership.financials, holdingCost: dealership.financials.holdingCost + holding } };
        next = { ...next, businesses: next.businesses.map((business) => business.id === dealership.businessId ? { ...business, expenses: business.expenses + holding, otherExpenses: business.otherExpenses + holding } : business) };
      }
    }
    next = replaceDealership(next, dealership);
    next = processDealershipAutomation(next, getDealership(next, dealership.id));
    dealership = getDealership(next, dealership.id);
    for (const vehicle of dealership.vehicles.filter((item) => item.status === "LISTED")) {
      const chance = dealershipSaleChance(next, dealership.id, vehicle.id);
      if (deterministicRoll(next.date, vehicle.id) < chance) next = sellVehicle(next, dealership.id, vehicle.id);
    }
  }
  if (next.date.day === 1 && !next.carDealership.events.some((item) => item.id === `dealer-event-${next.date.year}-${next.date.month}`)) {
    next = { ...next, carDealership: { ...next.carDealership, events: [{ id: `dealer-event-${next.date.year}-${next.date.month}`, type: "DEMAND_SPIKE", title: "Local demand shift", description: "SUV and luxury interest changed this month.", gameDate: { ...next.date } }, ...next.carDealership.events] } };
  }
  return next;
}

export function debugSpawnVehicles(state: GameState, kind: "TWENTY" | "PROFITABLE" | "LUXURY" | "SUPERCAR" = "TWENTY"): GameState {
  if (state.mode !== "TEST") throw new Error("Debug vehicle tools require the test save");
  const count = kind === "TWENTY" ? 20 : 30, generated = generateVehicleMarket(state.date, state.carDealership.marketGeneration + 1, state.carDealership.marketState, count);
  let selected = kind === "TWENTY" ? generated : generated.filter((item) => kind === "PROFITABLE" ? item.estimatedMarketValue > item.sellerPrice * 1.15 : kind === "SUPERCAR" ? item.category === "SUPERCAR" : item.category === "LUXURY");
  if (!selected.length) selected = generated.slice(0, 1);
  selected = (kind === "TWENTY" ? selected : selected.slice(0, 1)).map((item) => ({ ...item, sellerPrice: kind === "PROFITABLE" ? Math.round(item.estimatedMarketValue * 0.6) : item.sellerPrice, history: [history(state, "DEBUG", `DEBUG: Spawned ${kind}`), ...item.history] }));
  return { ...state, carDealership: { ...state.carDealership, marketGeneration: state.carDealership.marketGeneration + 1, marketOffers: selected } };
}

export function debugDealership(state: GameState, action: "REPUTATION" | "CAPACITY" | "COMPLETE_WORK" | "FORCE_SALE"): GameState {
  if (state.mode !== "TEST") throw new Error("Debug dealership tools require the test save");
  const dealership = state.carDealership.dealerships[0];
  if (!dealership) throw new Error("Open a dealership first");
  if (action === "REPUTATION") return replaceDealership(state, { ...dealership, reputation: 100 });
  if (action === "CAPACITY") return replaceDealership(state, { ...dealership, capacity: 500 });
  if (action === "COMPLETE_WORK") return processCarDealershipDay(replaceDealership(state, { ...dealership, vehicles: dealership.vehicles.map((item) => item.workOrder ? { ...item, workOrder: { ...item.workOrder, completesAt: { ...state.date } } } : item) }));
  const listed = dealership.vehicles.find((item) => item.status === "LISTED");
  if (!listed) throw new Error("List a vehicle first");
  return sellVehicle(state, dealership.id, listed.id);
}

export function debugHireDealershipTeam(state: GameState): GameState {
  if (state.mode !== "TEST") throw new Error("Debug dealership tools require the test save");
  const dealership = state.carDealership.dealerships[0];
  if (!dealership) throw new Error("Open a dealership first");
  const roles: Employee["role"][] = ["VEHICLE_BUYER", "SALESPERSON", "MECHANIC", "DETAILER", "DEALERSHIP_MANAGER"];
  const generated = generateCandidates(state.date, state.staff.candidateGeneration + 100);
  let next: GameState = { ...state, staff: { ...state.staff, candidates: [...generated, ...state.staff.candidates], candidateGeneration: state.staff.candidateGeneration + 100 } };
  for (const role of roles) {
    const candidate = next.staff.candidates.find((item) => item.role === role);
    if (candidate) next = hireEmployee(next, candidate.id, dealership.businessId);
  }
  return { ...next, staff: { ...next.staff, employees: next.staff.employees.map((employee) => employee.businessId === dealership.businessId ? { ...employee, skill: 100, efficiency: 100, reliability: 100, morale: 100, performance: 100, history: [{ id: makeId("staff-history"), type: "DEBUG", gameDate: { ...next.date }, description: "DEBUG: Elite dealership team" }, ...employee.history] } : employee) } };
}
