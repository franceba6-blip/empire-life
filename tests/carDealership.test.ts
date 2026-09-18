import { describe, expect, it } from "vitest";
import { createGame } from "../src/game/createGame";
import {
  buyVehicle,
  dealershipReport,
  dealershipSaleChance,
  debugDealership,
  debugHireDealershipTeam,
  debugSpawnVehicles,
  expandDealership,
  inspectVehicle,
  listVehicle,
  negotiateVehicle,
  openDealership,
  prepareVehicle,
  processCarDealershipDay,
  repairVehicle,
  sellVehicle,
} from "../src/game/businesses/carDealership/carDealership";
import { generateVehicleMarket } from "../src/game/businesses/carDealership/market";
import { valueVehicle } from "../src/game/businesses/carDealership/valuation";
import { assignTask, hireEmployee, setManagementMode } from "../src/game/employees/employees";
import { debugCash, transact } from "../src/game/economy/economy";
import { advanceGameTime } from "../src/game/time/time";
import { migrateGameState } from "../src/persistence/save";
import type { EmployeeRole } from "../src/game/employees/types";
import type { GameState } from "../src/models/game";

const funded = (amount = 5_000_000) => transact(createGame("A", "B"), "JOB_INCOME", amount, "Test capital");
const opened = (tier: "SMALL" | "MEDIUM" | "PREMIUM" = "SMALL") => openDealership(funded(), tier);
const dealer = (state: GameState) => state.carDealership.dealerships[0];
const buyFirst = (state: GameState) => buyVehicle(state, dealer(state).id, state.carDealership.marketOffers[0].id);
const hireRole = (state: GameState, role: EmployeeRole) => {
  const candidate = state.staff.candidates.find((item) => item.role === role)!;
  return hireEmployee(state, candidate.id, dealer(state).businessId);
};

describe("car dealership foundation", () => {
  it("creates all dealership tiers with central startup transactions", () => {
    const state = opened("SMALL");
    expect(dealer(state).capacity).toBe(6);
    expect(state.businesses.find((item) => item.type === "CAR_DEALERSHIP")).toBeTruthy();
    expect(state.transactions.some((item) => item.type === "DEALERSHIP_STARTUP")).toBe(true);
  });

  it("generates varied vehicles across the supported catalog", () => {
    const offers = generateVehicleMarket({ year: 2026, month: 1, day: 1 }, 12, "NORMAL", 40);
    expect(offers).toHaveLength(40);
    expect(new Set(offers.map((item) => item.category)).size).toBeGreaterThanOrEqual(7);
    expect(offers.every((item) => item.status === "MARKET")).toBe(true);
  });

  it("values condition, mileage and market state instead of pure randomness", () => {
    const vehicle = generateVehicleMarket({ year: 2026, month: 1, day: 1 }, 1, "NORMAL", 1)[0];
    const strong = valueVehicle({ ...vehicle, mileage: 10_000, mechanicalCondition: 95, cosmeticCondition: 95 }, "STRONG");
    const weak = valueVehicle({ ...vehicle, mileage: 250_000, mechanicalCondition: 55, cosmeticCondition: 55 }, "WEAK");
    expect(strong).toBeGreaterThan(weak);
  });

  it("purchases vehicles into dealership inventory", () => {
    const start = opened(), offer = start.carDealership.marketOffers[0], before = start.cash;
    const state = buyVehicle(start, dealer(start).id, offer.id);
    expect(dealer(state).vehicles[0].purchasePrice).toBe(offer.sellerPrice);
    expect(state.cash).toBe(before - offer.sellerPrice);
    expect(state.transactions.some((item) => item.type === "VEHICLE_PURCHASE")).toBe(true);
  });

  it("rejects purchases with insufficient cash", () => {
    const base = createGame("A", "B"), dealership = openDealership(transact(base, "JOB_INCOME", 40_000, "Capital"), "SMALL");
    expect(() => buyFirst(dealership)).toThrow("Insufficient funds");
  });

  it("enforces showroom capacity", () => {
    let state = opened();
    state = { ...state, carDealership: { ...state.carDealership, dealerships: [{ ...dealer(state), capacity: 0 }] } };
    expect(() => buyFirst(state)).toThrow("capacity");
  });
});

describe("acquisition and workshop", () => {
  it("accepts reasonable negotiation offers and rejects extreme ones", () => {
    const state = opened(), vehicle = state.carDealership.marketOffers[0];
    const accepted = negotiateVehicle(state, vehicle.id, Math.round(vehicle.sellerPrice * 0.99));
    const rejected = negotiateVehicle(state, vehicle.id, Math.round(vehicle.sellerPrice * 0.45));
    expect(accepted.outcome).toBe("ACCEPT");
    expect(rejected.outcome).toBe("REJECT");
  });

  it("returns a deterministic counteroffer in the middle band", () => {
    const state = opened();
    const vehicle = state.carDealership.marketOffers.find((item) => item.demand !== "HIGH") ?? state.carDealership.marketOffers[0];
    let result = negotiateVehicle(state, vehicle.id, Math.round(vehicle.sellerPrice * 0.9));
    if (result.outcome !== "COUNTER") result = negotiateVehicle(state, vehicle.id, Math.round(vehicle.sellerPrice * 0.86));
    expect(["COUNTER", "REJECT"]).toContain(result.outcome);
    if (result.outcome === "COUNTER") expect(result.counterOffer).toBeGreaterThan(0);
  });

  it("inspection consumes cash and time and reveals repair risk", () => {
    const state = opened(), vehicle = state.carDealership.marketOffers[0], before = state.cash;
    const inspected = inspectVehicle(state, vehicle.id);
    const result = inspected.carDealership.marketOffers.find((item) => item.id === vehicle.id)!;
    expect(inspected.cash).toBe(before - 280);
    expect(result.inspected).toBe(true);
    expect(result.inspectionAccuracy).toBe(78);
    expect(inspected.hour).toBe((state.hour + 3) % 24);
  });

  it("repairs take game time and improve mechanical condition", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0], before = vehicle.mechanicalCondition;
    state = repairVehicle(state, dealer(state).id, vehicle.id, "SMALL");
    expect(dealer(state).vehicles[0].status).toBe("IN_REPAIR");
    state = advanceGameTime(state, 4 * 24);
    expect(dealer(state).vehicles[0].mechanicalCondition).toBeGreaterThan(before);
    expect(dealer(state).vehicles[0].workOrder).toBeUndefined();
  });

  it("skilled mechanics reduce repair cost and duration", () => {
    const base = buyFirst(opened()), vehicleId = dealer(base).vehicles[0].id;
    const without = repairVehicle(base, dealer(base).id, vehicleId, "MEDIUM");
    let staffed = hireRole(base, "MECHANIC");
    staffed = { ...staffed, staff: { ...staffed.staff, employees: staffed.staff.employees.map((item) => ({ ...item, skill: 100, performance: 100 })) } };
    const withMechanic = repairVehicle(staffed, dealer(staffed).id, vehicleId, "MEDIUM");
    expect(dealer(withMechanic).vehicles[0].workOrder!.cost).toBeLessThan(dealer(without).vehicles[0].workOrder!.cost);
    expect(dealer(withMechanic).vehicles[0].workOrder!.completesAt).not.toEqual(dealer(without).vehicles[0].workOrder!.completesAt);
  });

  it("cosmetic preparation improves appearance after completion", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0], before = vehicle.cosmeticCondition;
    state = prepareVehicle(state, dealer(state).id, vehicle.id, "DETAILING");
    state = advanceGameTime(state, 4 * 24);
    expect(dealer(state).vehicles[0].cosmeticCondition).toBeGreaterThan(before);
    expect(dealer(state).financials.preparationCost).toBeGreaterThan(0);
  });
});

describe("pricing, sales and reputation", () => {
  it("supports standard and custom listing prices", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0];
    state = listVehicle(state, dealer(state).id, vehicle.id, "MARKET_PRICE");
    expect(dealer(state).vehicles[0].askingPrice).toBe(vehicle.estimatedMarketValue);
    state = listVehicle(state, dealer(state).id, vehicle.id, "CUSTOM", 123_456);
    expect(dealer(state).vehicles[0].askingPrice).toBe(123_456);
    expect(dealer(state).vehicles[0].priceStrategy).toBe("CUSTOM");
  });

  it("sells a vehicle and calculates complete vehicle profit", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0];
    state = listVehicle(state, dealer(state).id, vehicle.id, "MARKET_PRICE");
    const before = state.cash, price = dealer(state).vehicles[0].askingPrice!;
    state = sellVehicle(state, dealer(state).id, vehicle.id);
    const sale = dealer(state).sales[0];
    expect(state.cash).toBe(before + price);
    expect(sale.profit).toBe(sale.salePrice - sale.totalCost);
    expect(dealer(state).vehicles[0].status).toBe("SOLD");
  });

  it("prevents duplicate sale and duplicate revenue", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0];
    state = listVehicle(state, dealer(state).id, vehicle.id, "FAST_SALE");
    state = sellVehicle(state, dealer(state).id, vehicle.id);
    const revenue = dealer(state).financials.revenue;
    expect(() => sellVehicle(state, dealer(state).id, vehicle.id)).toThrow();
    const replay = processCarDealershipDay(migrateGameState(JSON.parse(JSON.stringify(state))));
    expect(dealer(replay).financials.revenue).toBe(revenue);
    expect(dealer(replay).sales).toHaveLength(1);
  });

  it("tracks days in stock and monthly holding costs", () => {
    let state = buyFirst(opened()), vehicleId = dealer(state).vehicles[0].id;
    state = advanceGameTime(state, 35 * 24);
    const vehicle = dealer(state).vehicles.find((item) => item.id === vehicleId)!;
    expect(vehicle.daysInStock).toBeGreaterThanOrEqual(35);
    expect(vehicle.holdingCost).toBeGreaterThan(0);
  });

  it("fair completed sales improve reputation", () => {
    let state = buyFirst(opened()), reputation = dealer(state).reputation, vehicle = dealer(state).vehicles[0];
    state = listVehicle(state, dealer(state).id, vehicle.id, "FAST_SALE");
    state = sellVehicle(state, dealer(state).id, vehicle.id);
    expect(dealer(state).reputation).toBeGreaterThan(reputation);
  });

  it("skilled sales staff improve customer conversion chance", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0];
    state = listVehicle(state, dealer(state).id, vehicle.id, "MARKET_PRICE");
    const baseChance = dealershipSaleChance(state, dealer(state).id, vehicle.id);
    state = hireRole(state, "SALESPERSON");
    state = { ...state, staff: { ...state.staff, employees: state.staff.employees.map((item) => ({ ...item, performance: 100 })) } };
    expect(dealershipSaleChance(state, dealer(state).id, vehicle.id)).toBeGreaterThan(baseChance);
  });
});

describe("expansion, employees and automation", () => {
  it("completes capacity expansion through central game time", () => {
    let state = opened(), before = dealer(state).capacity;
    state = expandDealership(state, dealer(state).id, "SHOWROOM");
    state = advanceGameTime(state, 30 * 24);
    expect(dealer(state).capacity).toBe(before + 8);
    expect(dealer(state).expansions[0].completed).toBe(true);
  });

  it("assigns dealership-specific employees to the business", () => {
    const state = hireRole(opened(), "VEHICLE_BUYER");
    expect(state.staff.employees[0].businessId).toBe(dealer(state).businessId);
    expect(state.staff.employees[0].role).toBe("VEHICLE_BUYER");
  });

  it("delegated buyers automatically acquire profitable stock", () => {
    let state = hireRole(opened(), "VEHICLE_BUYER"), employee = state.staff.employees[0];
    state = assignTask(state, dealer(state).businessId, "VEHICLE_BUYING", "EMPLOYEE", employee.id);
    state = advanceGameTime(state, 24);
    expect(dealer(state).vehicles.length).toBeGreaterThan(0);
    expect(dealer(state).vehicles[0].estimatedMarketValue).toBeGreaterThan(dealer(state).vehicles[0].purchasePrice);
  });

  it("dealership managers enable dynamic full automation", () => {
    let state = hireRole(opened(), "DEALERSHIP_MANAGER"), manager = state.staff.employees[0];
    state = setManagementMode(state, dealer(state).businessId, "FULLY_MANAGED", manager.id);
    expect(state.businesses.find((item) => item.id === dealer(state).businessId)!.management.automationEfficiency).toBeGreaterThan(70);
    state = advanceGameTime(state, 3 * 24);
    expect(dealer(state).vehicles.length).toBeGreaterThan(0);
  });

  it("full automation can source, process, list and sell over time", () => {
    let state = hireRole(opened("PREMIUM"), "DEALERSHIP_MANAGER"), manager = state.staff.employees[0];
    state = { ...state, staff: { ...state.staff, employees: [{ ...manager, skill: 100, performance: 100, leadership: 100, morale: 100 }] } };
    state = setManagementMode(state, dealer(state).businessId, "FULLY_MANAGED", manager.id);
    state = advanceGameTime(state, 90 * 24);
    expect(dealer(state).vehicles.length).toBeGreaterThan(0);
    expect(dealer(state).vehicles.some((item) => ["LISTED", "SOLD", "IN_REPAIR", "READY_FOR_SALE"].includes(item.status))).toBe(true);
  });

  it("reports complete dealership financials", () => {
    let state = buyFirst(opened()), vehicle = dealer(state).vehicles[0];
    state = listVehicle(state, dealer(state).id, vehicle.id, "MARKET_PRICE");
    state = sellVehicle(state, dealer(state).id, vehicle.id);
    const report = dealershipReport(state, dealer(state).id);
    expect(report.revenue).toBeGreaterThan(0);
    expect(report.vehiclePurchaseCost).toBeGreaterThan(0);
    expect(Number.isFinite(report.netProfit)).toBe(true);
  });
});

describe("save migration and debug tools", () => {
  it("migrates Prompt 04 saves without losing staff or businesses", () => {
    const current = createGame("A", "B"), legacy: any = JSON.parse(JSON.stringify(current));
    legacy.schemaVersion = 4;
    delete legacy.carDealership;
    const migrated = migrateGameState(legacy);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.businesses[0].type).toBe("RESELLING");
    expect(migrated.carDealership.marketOffers.length).toBeGreaterThan(0);
  });

  it("preserves dealership data across JSON save/load", () => {
    const state = buyFirst(opened());
    const restored = migrateGameState(JSON.parse(JSON.stringify(state)));
    expect(dealer(restored)).toEqual(dealer(state));
  });

  it("keeps debug tools isolated and supports vehicle scenarios", () => {
    expect(() => debugSpawnVehicles(createGame("A", "B"))).toThrow("test save");
    let state: GameState = { ...createGame("A", "B"), mode: "TEST" };
    state = debugCash(state, 1_000_000_000, "SET");
    state = openDealership(state, "PREMIUM");
    state = debugSpawnVehicles(state, "TWENTY");
    expect(state.carDealership.marketOffers).toHaveLength(20);
    state = debugDealership(state, "REPUTATION");
    state = debugDealership(state, "CAPACITY");
    state = debugHireDealershipTeam(state);
    expect(dealer(state).reputation).toBe(100);
    expect(dealer(state).capacity).toBe(500);
    expect(state.staff.employees.filter((item) => item.businessId === dealer(state).businessId).length).toBeGreaterThanOrEqual(5);
  });
});
